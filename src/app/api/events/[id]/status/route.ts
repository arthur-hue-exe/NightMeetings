import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin, jsonError } from "@/lib/api";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const statusSchema = z.object({
  status: z.enum(["ACTIVE", "CANCELLED"]),
});

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return jsonError("Origem da requisição não autorizada.", 403);
  }

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para gerenciar o evento.", 401);

  const { id } = await context.params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true, eventDate: true, endDate: true },
  });

  if (!event || event.status === "DELETED") {
    return jsonError("Evento não encontrado.", 404);
  }

  if (event.userId !== user.id) {
    return jsonError("Você não tem permissão para alterar este evento.", 403);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Dados inválidos.", 400);
  }

  const parsed = statusSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Status inválido.", 422);
  }

  await prisma.event.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ ok: true, status: parsed.data.status });
}
