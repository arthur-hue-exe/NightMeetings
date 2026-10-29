import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin, jsonError } from "@/lib/api";
import { unreadNotificationCount } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para atualizar notificações.", 401);

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const rawIds = (body as { ids?: unknown })?.ids;
  const ids = Array.isArray(rawIds)
    ? rawIds.filter((id): id is string => typeof id === "string" && id.length > 0).slice(0, 100)
    : null;

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });

  const unread = await unreadNotificationCount(user.id);
  return NextResponse.json({ ok: true, unread });
}
