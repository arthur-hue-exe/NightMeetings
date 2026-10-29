import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureAnonymousSession } from "@/lib/anonymous";
import { fieldErrors, isSameOrigin, jsonError, validationMessage } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { reportSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  const session = user ? null : await ensureAnonymousSession();
  const reporterKey = user ? `user:${user.id}` : `anon:${session!.id}`;

  const limit = rateLimit(`report:${reporterKey}`, 10, 60 * 60 * 1000);
  if (!limit.ok) {
    return jsonError("Você enviou muitas denúncias em pouco tempo. Tente mais tarde.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler os dados enviados.", 400);
  }

  const parsed = reportSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(validationMessage(parsed.error), 422, {
      fieldErrors: fieldErrors(parsed.error),
    });
  }

  if (parsed.data.targetType === "GLOBAL_MESSAGE") {
    const message = await prisma.globalMessage.findUnique({
      where: { id: parsed.data.targetId },
      select: { id: true },
    });
    if (!message) return jsonError("Mensagem não encontrada.", 404);
  } else {
    const community = await prisma.community.findUnique({
      where: { id: parsed.data.targetId },
      select: { id: true },
    });
    if (!community) return jsonError("Comunidade não encontrada.", 404);
  }

  const reporterWhere = user ? { reporterId: user.id } : { reporterSessionId: session!.id };
  const pending = await prisma.report.findFirst({
    where: {
      ...reporterWhere,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      status: "PENDING",
    },
    select: { id: true },
  });
  if (pending) {
    return NextResponse.json(
      { ok: true, reportId: pending.id, duplicate: true },
      { status: 200 },
    );
  }

  try {
    const report = await prisma.report.create({
      data: {
        reporterId: user?.id ?? null,
        reporterSessionId: session?.id ?? null,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        reason: parsed.data.reason,
        details: parsed.data.details || null,
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, reportId: report.id }, { status: 201 });
  } catch (error) {
    console.error("Falha ao registrar denúncia", error);
    return jsonError("Não foi possível registrar a denúncia agora.", 500);
  }
}
