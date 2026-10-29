import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fieldErrors, isSameOrigin, jsonError, validationMessage } from "@/lib/api";
import {
  getConversationMembership,
  isConversationManager,
  notifyConversationChanged,
} from "@/lib/messaging";
import { notifyGroupAdded, notifyGroupUpdated } from "@/lib/notifications";
import { conversationMembersSchema } from "@/lib/validation";
import { MAX_GROUP_MEMBERS } from "@/lib/constants";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function readBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para gerenciar o grupo.", 401);

  const { id } = await params;
  const membership = await getConversationMembership(id, user.id);
  if (!membership) return jsonError("Conversa não encontrada.", 404);
  if (!isConversationManager(membership.conversation, membership.role, user.id)) {
    return jsonError("Apenas administradores do grupo podem adicionar participantes.", 403);
  }

  const body = await readBody(request);
  const parsed = conversationMembersSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(validationMessage(parsed.error), 422, {
      fieldErrors: fieldErrors(parsed.error),
    });
  }

  const existing = await prisma.conversationMember.findMany({
    where: { conversationId: id },
    select: { userId: true },
  });
  const existingIds = new Set(existing.map((member) => member.userId));
  const candidates = [...new Set(parsed.data.userIds)].filter((userId) => !existingIds.has(userId));

  if (candidates.length === 0) {
    return jsonError("Esses usuários já participam do grupo.", 422);
  }
  if (existingIds.size + candidates.length > MAX_GROUP_MEMBERS) {
    return jsonError(`O grupo pode ter no máximo ${MAX_GROUP_MEMBERS} participantes.`, 422);
  }

  const users = await prisma.user.findMany({
    where: { id: { in: candidates } },
    select: { id: true },
  });
  if (users.length !== candidates.length) {
    return jsonError("Um ou mais usuários não foram encontrados.", 422);
  }

  await prisma.conversationMember.createMany({
    data: candidates.map((userId) => ({ conversationId: id, userId })),
  });

  await notifyGroupAdded({
    conversationId: id,
    groupName: membership.conversation.name ?? "privado",
    addedById: user.id,
    addedByName: user.name,
    userIds: candidates,
  });

  notifyConversationChanged([...existingIds, ...candidates], id);
  return NextResponse.json({ ok: true, added: candidates.length });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para gerenciar o grupo.", 401);

  const { id } = await params;
  const membership = await getConversationMembership(id, user.id);
  if (!membership) return jsonError("Conversa não encontrada.", 404);
  if (!isConversationManager(membership.conversation, membership.role, user.id)) {
    return jsonError("Apenas administradores do grupo podem remover participantes.", 403);
  }

  const body = await readBody(request);
  const parsed = conversationMembersSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(validationMessage(parsed.error), 422, {
      fieldErrors: fieldErrors(parsed.error),
    });
  }

  const targets = [...new Set(parsed.data.userIds)].filter((userId) => userId !== user.id);
  if (targets.length === 0) {
    return jsonError("Você não pode remover a si mesmo por aqui. Use a opção de sair do grupo.", 422);
  }

  const removed = await prisma.conversationMember.deleteMany({
    where: { conversationId: id, userId: { in: targets } },
  });
  if (removed.count === 0) {
    return jsonError("Nenhum participante removido.", 404);
  }

  const remaining = await prisma.conversationMember.findMany({
    where: { conversationId: id },
    select: { userId: true },
  });
  const remainingIds = remaining.map((member) => member.userId);

  await notifyGroupUpdated({
    conversationId: id,
    title: "Você saiu do grupo",
    body: `${user.name} removeu você do grupo ${membership.conversation.name ?? "privado"}.`,
    userIds: targets.filter((target) => !remainingIds.includes(target)),
  });
  notifyConversationChanged([...remainingIds, ...targets], id);

  return NextResponse.json({ ok: true, removed: removed.count });
}
