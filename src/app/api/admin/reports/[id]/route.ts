import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin, jsonError, validationMessage } from "@/lib/api";
import { forumChannel } from "@/lib/forum";
import { publish } from "@/lib/realtime";

export const runtime = "nodejs";

const schema = z.object({
  action: z.enum(["RESOLVE", "DISMISS"]),
  hideContent: z.boolean().default(false),
});

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta.", 401);
  if (user.role !== "ADMIN") return jsonError("Acesso restrito à moderação.", 403);

  const { id } = await context.params;
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return jsonError("Denúncia não encontrada.", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler os dados enviados.", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(validationMessage(parsed.error), 422);

  const status = parsed.data.action === "RESOLVE" ? "RESOLVED" : "DISMISSED";

  await prisma.report.update({
    where: { id },
    data: { status, reviewedAt: new Date(), reviewedById: user.id },
  });

  if (parsed.data.hideContent && report.targetType === "GLOBAL_MESSAGE") {
    await prisma.globalMessage.updateMany({
      where: { id: report.targetId },
      data: { moderationStatus: "HIDDEN" },
    });
    publish(forumChannel(), "removed", { id: report.targetId });
    await prisma.moderationLog.create({
      data: {
        actorId: user.id,
        action: "MESSAGE_HIDDEN",
        targetType: "GLOBAL_MESSAGE",
        targetId: report.targetId,
        notes: `Ocultada após denúncia (${report.reason}).`,
      },
    });
  }

  await prisma.moderationLog.create({
    data: {
      actorId: user.id,
      action: status === "RESOLVED" ? "REPORT_RESOLVED" : "REPORT_DISMISSED",
      targetType: report.targetType,
      targetId: report.targetId,
      notes: `Denúncia ${report.id}.`,
    },
  });

  return NextResponse.json({ ok: true, status });
}
