import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fieldErrors, isSameOrigin, jsonError, validationMessage } from "@/lib/api";
import {
  getConversationMembership,
  getConversationMessages,
  markConversationRead,
  userChannel,
} from "@/lib/messaging";
import { notifyPrivateMessage } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { publish } from "@/lib/realtime";
import { privateMessageSchema } from "@/lib/validation";
import { MESSAGE_PAGE_SIZE } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para acessar as mensagens.", 401);

  const { id } = await params;
  const search = request.nextUrl.searchParams;
  const messages = await getConversationMessages({
    conversationId: id,
    userId: user.id,
    before: search.get("before") ?? undefined,
    limit: Number(search.get("limit") ?? MESSAGE_PAGE_SIZE),
  });
  if (!messages) return jsonError("Conversa não encontrada.", 404);

  return NextResponse.json(
    { ok: true, ...messages },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para enviar mensagens.", 401);

  const { id } = await params;
  const membership = await getConversationMembership(id, user.id);
  if (!membership) return jsonError("Conversa não encontrada.", 404);
  if (membership.conversation.status !== "ACTIVE") {
    return jsonError("Esta conversa foi encerrada.", 403);
  }

  const limit = rateLimit(`message:${user.id}`, 30, 60 * 1000);
  if (!limit.ok) {
    return jsonError("Você está enviando mensagens rápido demais. Aguarde um instante.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler os dados enviados.", 400);
  }

  const parsed = privateMessageSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(validationMessage(parsed.error), 422, {
      fieldErrors: fieldErrors(parsed.error),
    });
  }

  try {
    const message = await prisma.privateMessage.create({
      data: {
        conversationId: id,
        senderId: user.id,
        content: parsed.data.content,
      },
      include: { sender: { select: { id: true, name: true } } },
    });

    await markConversationRead(id, user.id);

    const members = await prisma.conversationMember.findMany({
      where: { conversationId: id },
      select: { userId: true },
    });
    const memberIds = members.map((member) => member.userId);

    for (const memberId of memberIds) {
      publish(userChannel(memberId), "message", {
        conversationId: id,
        message: {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          senderId: message.senderId,
          senderName: message.sender.name,
          own: message.senderId === memberId,
        },
      });
    }

    await notifyPrivateMessage({
      conversationId: id,
      senderId: user.id,
      senderName: user.name,
      memberIds,
    });

    return NextResponse.json(
      {
        ok: true,
        message: {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt.toISOString(),
          senderId: message.senderId,
          senderName: message.sender.name,
          own: true,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Falha ao enviar mensagem privada", error);
    return jsonError("Não foi possível enviar a mensagem agora.", 500);
  }
}
