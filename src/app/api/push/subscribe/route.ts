import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ensureAnonymousSession } from "@/lib/anonymous";
import { isSameOrigin, jsonError } from "@/lib/api";
import { isPushConfigured } from "@/lib/push";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const subscribeSchema = z.object({
  endpoint: z
    .string()
    .trim()
    .min(10)
    .max(500)
    .refine((value) => {
      try {
        const url = new URL(value);
        return (
          url.protocol === "https:" ||
          (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
        );
      } catch {
        return false;
      }
    }, "Endpoint de push inválido."),
  keys: z.object({
    p256dh: z.string().trim().min(16).max(200),
    auth: z.string().trim().min(8).max(100),
  }),
});

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  if (!isPushConfigured()) {
    return jsonError("As notificações push não estão configuradas neste servidor.", 503);
  }

  const user = await getCurrentUser();
  const session = user ? null : await ensureAnonymousSession();
  const identityKey = user ? `user:${user.id}` : `anon:${session!.id}`;

  const limit = rateLimit(`push-subscribe:${identityKey}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return jsonError("Muitas tentativas de inscrição. Tente mais tarde.", 429);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler os dados enviados.", 400);
  }

  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Dados de inscrição inválidos.", 422);
  }

  try {
    await prisma.pushSubscription.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userId: user?.id ?? null,
        anonymousSessionId: session?.id ?? null,
        userAgent: request.headers.get("user-agent")?.slice(0, 250) ?? null,
      },
      update: {
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userId: user?.id ?? null,
        anonymousSessionId: session?.id ?? null,
        userAgent: request.headers.get("user-agent")?.slice(0, 250) ?? null,
      },
    });
    return NextResponse.json({ ok: true, subscribed: true });
  } catch (error) {
    console.error("Falha ao salvar inscrição push", error);
    return jsonError("Não foi possível salvar a inscrição de notificações.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  const session = user ? null : await ensureAnonymousSession();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler os dados enviados.", 400);
  }

  const endpoint = (body as { endpoint?: unknown })?.endpoint;
  if (typeof endpoint !== "string" || endpoint.length < 10) {
    return jsonError("Endpoint inválido.", 422);
  }

  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint },
    select: { id: true, userId: true, anonymousSessionId: true },
  });

  const owns =
    existing &&
    ((user && existing.userId === user.id) ||
      (session && existing.anonymousSessionId === session.id));

  if (existing && owns) {
    await prisma.pushSubscription.delete({ where: { id: existing.id } });
  }

  return NextResponse.json({ ok: true, subscribed: false });
}
