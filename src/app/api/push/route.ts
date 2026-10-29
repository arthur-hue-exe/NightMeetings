import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAnonymousSession } from "@/lib/anonymous";
import { isPushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  const session = user ? null : await getAnonymousSession();
  const endpoint = new URL(request.url).searchParams.get("endpoint");

  let subscribed = false;
  if (endpoint && (user || session)) {
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint },
      select: { userId: true, anonymousSessionId: true },
    });
    subscribed = Boolean(
      existing &&
        ((user && existing.userId === user.id) ||
          (session && existing.anonymousSessionId === session.id)),
    );
  }

  return NextResponse.json(
    {
      ok: true,
      configured: isPushConfigured(),
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null,
      subscribed,
      authenticated: Boolean(user),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
