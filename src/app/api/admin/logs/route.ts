import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta.", 401);
  if (user.role !== "ADMIN") return jsonError("Acesso restrito à moderação.", 403);

  const logs = await prisma.moderationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { actor: { select: { name: true } } },
  });

  return NextResponse.json(
    {
      ok: true,
      logs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        targetType: log.targetType,
        targetId: log.targetId,
        notes: log.notes,
        actorName: log.actor.name,
        createdAt: log.createdAt.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
