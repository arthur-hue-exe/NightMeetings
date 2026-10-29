import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fieldErrors, isSameOrigin, jsonError, validationMessage } from "@/lib/api";
import { getUserConversations, notifyConversationChanged } from "@/lib/messaging";
import { notifyGroupAdded } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { directConversationSchema, groupConversationSchema } from "@/lib/validation";
import { MAX_GROUP_MEMBERS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para acessar as mensagens.", 401);

  const conversations = await getUserConversations(user.id);
  return NextResponse.json(
    { ok: true, conversations, unread: conversations.reduce((sum, item) => sum + item.unread, 0) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para iniciar uma conversa.", 401);

  const limit = rateLimit(`conversation-create:${user.id}`, 20, 60 * 60 * 1000);
  if (!limit.ok) {
    return jsonError("Você criou muitas conversas em pouco tempo. Tente mais tarde.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler os dados enviados.", 400);
  }

  const type = (body as { type?: unknown })?.type;
  if (type === "DIRECT") {
    return createDirect(request, body, user.id);
  }
  if (type === "GROUP") {
    return createGroup(body, user);
  }
  return jsonError("Tipo de conversa inválido.", 422);
}

async function createDirect(_request: NextRequest, body: unknown, userId: string) {
  const parsed = directConversationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(validationMessage(parsed.error), 422, {
      fieldErrors: fieldErrors(parsed.error),
    });
  }
  if (parsed.data.userId === userId) {
    return jsonError("Você não pode iniciar uma conversa consigo mesmo.", 422);
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true },
  });
  if (!target) return jsonError("Usuário não encontrado.", 404);

  const candidates = await prisma.conversation.findMany({
    where: {
      type: "DIRECT",
      AND: [
        { members: { some: { userId } } },
        { members: { some: { userId: parsed.data.userId } } },
      ],
    },
    include: { members: { select: { userId: true } } },
  });
  const existing = candidates.find((conversation) => conversation.members.length === 2);
  if (existing) {
    return NextResponse.json({ ok: true, conversationId: existing.id, existing: true });
  }

  const conversation = await prisma.conversation.create({
    data: {
      type: "DIRECT",
      createdById: userId,
      members: { create: [{ userId }, { userId: parsed.data.userId }] },
    },
    select: { id: true },
  });

  notifyConversationChanged([userId, parsed.data.userId], conversation.id);
  return NextResponse.json({ ok: true, conversationId: conversation.id }, { status: 201 });
}

async function createGroup(
  body: unknown,
  user: { id: string; name: string },
) {
  const parsed = groupConversationSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(validationMessage(parsed.error), 422, {
      fieldErrors: fieldErrors(parsed.error),
    });
  }

  const memberIds = [...new Set(parsed.data.memberIds)].filter((id) => id !== user.id);
  if (memberIds.length === 0) {
    return jsonError("Convide pelo menos um participante.", 422, {
      fieldErrors: { memberIds: "Convide pelo menos um participante." },
    });
  }
  if (memberIds.length + 1 > MAX_GROUP_MEMBERS) {
    return jsonError(`O grupo pode ter no máximo ${MAX_GROUP_MEMBERS} participantes.`, 422);
  }

  const members = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true },
  });
  if (members.length !== memberIds.length) {
    return jsonError("Um ou mais participantes não foram encontrados.", 422);
  }

  const conversation = await prisma.conversation.create({
    data: {
      type: "GROUP",
      name: parsed.data.name,
      imageUrl: parsed.data.imageUrl || null,
      createdById: user.id,
      members: {
        create: [
          { userId: user.id, role: "ADMIN" },
          ...memberIds.map((userId) => ({ userId })),
        ],
      },
    },
    select: { id: true },
  });

  await notifyGroupAdded({
    conversationId: conversation.id,
    groupName: parsed.data.name,
    addedById: user.id,
    addedByName: user.name,
    userIds: memberIds,
  });

  notifyConversationChanged([user.id, ...memberIds], conversation.id);
  return NextResponse.json({ ok: true, conversationId: conversation.id }, { status: 201 });
}
