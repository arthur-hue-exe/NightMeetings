import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin, jsonError, validationMessage } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  sessionId: z.string().trim().min(1, "Sessão inválida."),
  reason: z.string().trim().min(3, "Descreva o motivo da suspensão.").max(200),
  hours: z.coerce.number().int().min(1).max(720).default(24),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta.", 401);
  if (user.role !== "ADMIN") return jsonError("Acesso restrito à moderação.", 403);

  const bans = await prisma.forumBan.findMany({
    where: { expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { session: { select: { nickname: true } } },
  });

  return NextResponse.json(
    {
      ok: true,
      bans: bans.map((ban) => ({
        id: ban.id,
        sessionId: ban.sessionId,
        nickname: ban.session.nickname,
        reason: ban.reason,
        expiresAt: ban.expiresAt.toISOString(),
        createdAt: ban.createdAt.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta.", 401);
  if (user.role !== "ADMIN") return jsonError("Acesso restrito à moderação.", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler os dados enviados.", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(validationMessage(parsed.error), 422);

  const session = await prisma.anonymousSession.findUnique({
    where: { id: parsed.data.sessionId },
    select: { id: true },
  });
  if (!session) return jsonError("Sessão anônima não encontrada.", 404);

  const expiresAt = new Date(Date.now() + parsed.data.hours * 60 * 60 * 1000);
  const ban = await prisma.forumBan.create({
    data: {
      sessionId: parsed.data.sessionId,
      reason: parsed.data.reason,
      expiresAt,
      createdById: user.id,
    },
    select: { id: true, expiresAt: true },
  });

  await prisma.moderationLog.create({
    data: {
      actorId: user.id,
      action: "FORUM_BAN",
      targetType: "ANONYMOUS_SESSION",
      targetId: parsed.data.sessionId,
      notes: `${parsed.data.hours}h — ${parsed.data.reason}`,
    },
  });

  return NextResponse.json({ ok: true, ban });
}
