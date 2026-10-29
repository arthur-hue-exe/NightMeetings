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
  status: z.enum(["VISIBLE", "HIDDEN"]),
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta.", 401);
  if (user.role !== "ADMIN") return jsonError("Acesso restrito à moderação.", 403);

  const { id } = await context.params;
  const message = await prisma.globalMessage.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!message) return jsonError("Mensagem não encontrada.", 404);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler os dados enviados.", 400);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(validationMessage(parsed.error), 422);

  await prisma.globalMessage.update({
    where: { id },
    data: { moderationStatus: parsed.data.status },
  });

  await prisma.moderationLog.create({
    data: {
      actorId: user.id,
      action: parsed.data.status === "HIDDEN" ? "MESSAGE_HIDDEN" : "MESSAGE_RESTORED",
      targetType: "GLOBAL_MESSAGE",
      targetId: id,
    },
  });

  if (parsed.data.status === "HIDDEN") {
    publish(forumChannel(), "removed", { id });
  } else {
    publish(forumChannel(), "refresh", {});
  }

  return NextResponse.json({ ok: true, status: parsed.data.status });
}
