import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin, jsonError, validationMessage } from "@/lib/api";

export const runtime = "nodejs";

const schema = z.object({ status: z.enum(["ACTIVE", "DISABLED"]) });

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para alterar a comunidade.", 401);

  const { id } = await context.params;
  const community = await prisma.community.findUnique({ where: { id } });
  if (!community) return jsonError("Comunidade não encontrada.", 404);
  if (community.creatorId !== user.id && user.role !== "ADMIN") {
    return jsonError("Você não tem permissão para alterar esta comunidade.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler os dados enviados.", 400);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(validationMessage(parsed.error), 422);

  await prisma.community.update({ where: { id }, data: { status: parsed.data.status } });
  await prisma.moderationLog.create({
    data: {
      actorId: user.id,
      action: parsed.data.status === "ACTIVE" ? "COMMUNITY_ACTIVATED" : "COMMUNITY_DISABLED",
      targetType: "COMMUNITY",
      targetId: id,
    },
  });

  return NextResponse.json({ ok: true, status: parsed.data.status });
}
