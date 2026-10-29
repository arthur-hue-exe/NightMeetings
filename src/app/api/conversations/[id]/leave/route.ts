import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin, jsonError } from "@/lib/api";
import { getConversationMembership, notifyConversationChanged } from "@/lib/messaging";
import { notifyGroupUpdated } from "@/lib/notifications";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para sair da conversa.", 401);

  const { id } = await params;
  const membership = await getConversationMembership(id, user.id);
  if (!membership) return jsonError("Conversa não encontrada.", 404);

  await prisma.conversationMember.delete({
    where: { conversationId_userId: { conversationId: id, userId: user.id } },
  });

  const remaining = await prisma.conversationMember.findMany({
    where: { conversationId: id },
    orderBy: { joinedAt: "asc" },
    select: { userId: true, role: true },
  });

  if (remaining.length === 0) {
    await prisma.conversation.update({
      where: { id },
      data: { status: "CLOSED" },
    });
  } else if (membership.conversation.type === "GROUP") {
    const hasAdmin = remaining.some((member) => member.role === "ADMIN");
    if (!hasAdmin) {
      const successor = remaining[0];
      if (successor) {
        await prisma.conversationMember.update({
          where: { conversationId_userId: { conversationId: id, userId: successor.userId } },
          data: { role: "ADMIN" },
        });
      }
    }
    await notifyGroupUpdated({
      conversationId: id,
      title: "Grupo atualizado",
      body: `${user.name} saiu do grupo ${membership.conversation.name ?? "privado"}.`,
      userIds: remaining.map((member) => member.userId),
    });
  }

  notifyConversationChanged([user.id, ...remaining.map((member) => member.userId)], id);
  return NextResponse.json({ ok: true });
}
