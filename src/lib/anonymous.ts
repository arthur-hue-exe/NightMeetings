import { randomBytes, randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ANON_SESSION_COOKIE } from "@/lib/constants";

const ANON_MAX_AGE = 30 * 24 * 60 * 60;

export type AnonymousIdentity = { id: string; nickname: string };

export async function getAnonymousSession(): Promise<AnonymousIdentity | null> {
  const store = await cookies();
  const id = store.get(ANON_SESSION_COOKIE)?.value;
  if (!id || id.length < 20) return null;
  const session = await prisma.anonymousSession.findUnique({
    where: { id },
    select: { id: true, nickname: true },
  });
  return session;
}

export async function ensureAnonymousSession(): Promise<AnonymousIdentity> {
  const store = await cookies();
  const existingId = store.get(ANON_SESSION_COOKIE)?.value;
  if (existingId && existingId.length >= 20) {
    const existing = await prisma.anonymousSession.findUnique({
      where: { id: existingId },
      select: { id: true, nickname: true },
    });
    if (existing) {
      await prisma.anonymousSession
        .update({ where: { id: existing.id }, data: { lastSeenAt: new Date() } })
        .catch(() => undefined);
      return existing;
    }
  }

  const id = randomBytes(24).toString("base64url");
  const nickname = `User ${randomInt(1000, 10000)}`;
  const session = await prisma.anonymousSession.create({
    data: { id, nickname },
    select: { id: true, nickname: true },
  });

  store.set(ANON_SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ANON_MAX_AGE,
  });

  return session;
}
