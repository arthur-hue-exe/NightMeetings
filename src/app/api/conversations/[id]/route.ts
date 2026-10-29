import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fieldErrors, isSameOrigin, jsonError, validationMessage } from "@/lib/api";
import {
  getConversationMembership,
  getConversationMessages,
  isConversationManager,
  notifyConversationChanged,
} from "@/lib/messaging";
import { notifyGroupUpdated } from "@/lib/notifications";
import { conversationUpdateSchema } from "@/lib/validation";
import { MESSAGE_PAGE_SIZE } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para acessar as mensagens.", 401);

  const { id } = await params;
  const membership = await getConversationMembership(id, user.id);
  if (!membership) return jsonError("Conversa não encontrada.", 404);

  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      members: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!conversation) return jsonError("Conversa não encontrada.", 404);

  const search = request.nextUrl.searchParams;
  const messages = await getConversationMessages({
    conversationId: id,
    userId: user.id,
    before: search.get("before") ?? undefined,
    limit: Number(search.get("limit") ?? MESSAGE_PAGE_SIZE),
  });

  const other = conversation.members.find((member) => member.userId !== user.id);
  const title =
    conversation.type === "GROUP" ? conversation.name ?? "Grupo privado" : other?.user.name ?? "Conversa";

  return NextResponse.json(
    {
      ok: true,
      conversation: {
        id: conversation.id,
        type: conversation.type,
        title,
        imageUrl: conversation.imageUrl,
        status: conversation.status,
        createdById: conversation.createdById,
        isManager: isConversationManager(conversation, membership.role, user.id),
        members: conversation.members.map((member) => ({
          id: member.userId,
          name: member.user.name,
          role: member.role,
        })),
      },
      messages: messages ?? { items: [], hasMore: false, nextBefore: null },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request: NextRequest, { params }: Params) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para alterar a conversa.", 401);

  const { id } = await params;
  const membership = await getConversationMembership(id, user.id);
  if (!membership) return jsonError("Conversa não encontrada.", 404);
  if (!isConversationManager(membership.conversation, membership.role, user.id)) {
    return jsonError("Apenas administradores do grupo podem fazer isso.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler os dados enviados.", 400);
  }

  const parsed = conversationUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(validationMessage(parsed.error), 422, {
      fieldErrors: fieldErrors(parsed.error),
    });
  }
  if (!parsed.data.name && parsed.data.imageUrl === undefined && !parsed.data.status) {
    return jsonError("Nada para atualizar.", 422);
  }

  const updated = await prisma.conversation.update({
    where: { id },
    data: {
      ...(parsed.data.name ? { name: parsed.data.name } : {}),
      ...(parsed.data.imageUrl !== undefined ? { imageUrl: parsed.data.imageUrl || null } : {}),
      ...(parsed.data.status ? { status: parsed.data.status } : {}),
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      status: true,
      members: { select: { userId: true } },
    },
  });

  const memberIds = updated.members.map((member) => member.userId);
  const targets = memberIds.filter((memberId) => memberId !== user.id);

  if (parsed.data.status === "CLOSED") {
    await notifyGroupUpdated({
      conversationId: id,
      title: "Grupo encerrado",
      body: `O grupo ${updated.name ?? "privado"} foi encerrado pelo administrador.`,
      userIds: memberIds,
    });
  } else if (parsed.data.name || parsed.data.imageUrl !== undefined) {
    await notifyGroupUpdated({
      conversationId: id,
      title: "Grupo atualizado",
      body: `${user.name} atualizou o grupo ${updated.name ?? "privado"}.`,
      userIds: targets,
    });
  }

  notifyConversationChanged(memberIds, id);
  return NextResponse.json({ ok: true });
}
