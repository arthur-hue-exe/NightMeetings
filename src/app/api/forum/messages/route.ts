import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fieldErrors, isSameOrigin, jsonError, validationMessage } from "@/lib/api";
import { ensureAnonymousSession } from "@/lib/anonymous";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import {
  forumChannel,
  getForumMessages,
  hashForumIp,
  isForumSessionBanned,
  maybeCleanupOldForumMessages,
} from "@/lib/forum";
import { publish } from "@/lib/realtime";
import { forumMessageSchema } from "@/lib/validation";
import { FORUM_PAGE_SIZE } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const limit = Number(params.get("limit") ?? FORUM_PAGE_SIZE);
  const data = await getForumMessages({
    before: params.get("before") ?? undefined,
    limit: Number.isFinite(limit) ? limit : FORUM_PAGE_SIZE,
  });
  return NextResponse.json(
    { ok: true, ...data },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  const session = user ? null : await ensureAnonymousSession();
  const identityKey = user ? `user:${user.id}` : `anon:${session!.id}`;

  if (session) {
    const ban = await isForumSessionBanned(session.id);
    if (ban) {
      return jsonError(
        `Sua participação no fórum está suspensa até ${ban.expiresAt.toLocaleString("pt-BR")}.`,
        403,
        { bannedUntil: ban.expiresAt.toISOString() },
      );
    }
  }

  const ipLimit = rateLimit(`forum-ip:${getClientIp(request.headers)}`, 30, 10 * 60 * 1000);
  if (!ipLimit.ok) {
    return jsonError("Muitas mensagens deste endereço. Aguarde alguns minutos.", 429);
  }
  const identityLimit = rateLimit(`forum-id:${identityKey}`, 12, 10 * 60 * 1000);
  if (!identityLimit.ok) {
    return jsonError("Você está enviando mensagens rápido demais. Aguarde um pouco.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler os dados enviados.", 400);
  }

  const parsed = forumMessageSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(validationMessage(parsed.error), 422, {
      fieldErrors: fieldErrors(parsed.error),
    });
  }

  const content = parsed.data.content.replace(/\r\n/g, "\n");

  const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const identityWhere = user ? { userId: user.id } : { sessionId: session!.id };
  const ipHash = hashForumIp(getClientIp(request.headers));

  const [recentByUser, recentByIdentity, recentByIp, duplicate] = await Promise.all([
    prisma.globalMessage.count({
      where: { ...identityWhere, createdAt: { gte: oneMinuteAgo } },
    }),
    prisma.globalMessage.count({
      where: { ...identityWhere, createdAt: { gte: tenMinutesAgo } },
    }),
    prisma.globalMessage.count({
      where: { ipHash, createdAt: { gte: tenMinutesAgo } },
    }),
    prisma.globalMessage.findFirst({
      where: {
        ...identityWhere,
        content,
        createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
      },
      select: { id: true },
    }),
  ]);

  if (recentByUser >= 3 || recentByIdentity >= 12) {
    return jsonError("Calma aí! Aguarde um instante antes de enviar outra mensagem.", 429);
  }
  if (recentByIp >= 30) {
    return jsonError("Muitas mensagens enviadas deste endereço. Tente novamente mais tarde.", 429);
  }
  if (duplicate) {
    return jsonError("Você já enviou essa mesma mensagem há instantes.", 409);
  }

  try {
    const message = await prisma.globalMessage.create({
      data: {
        sessionId: session?.id ?? null,
        userId: user?.id ?? null,
        displayName: user?.name ?? session!.nickname,
        content,
        ipHash,
      },
      select: { id: true, displayName: true, content: true, createdAt: true, userId: true },
    });

    const view = {
      id: message.id,
      displayName: message.displayName,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
      authenticated: Boolean(message.userId),
    };

    publish(forumChannel(), "message", view);
    void maybeCleanupOldForumMessages();

    return NextResponse.json({ ok: true, message: view }, { status: 201 });
  } catch (error) {
    console.error("Falha ao publicar mensagem no fórum", error);
    return jsonError("Não foi possível publicar sua mensagem agora. Tente novamente.", 500);
  }
}
