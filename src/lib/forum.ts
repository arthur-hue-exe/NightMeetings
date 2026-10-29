import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { FORUM_PAGE_SIZE } from "@/lib/constants";

export type ForumMessageView = {
  id: string;
  displayName: string;
  content: string;
  createdAt: string;
  authenticated: boolean;
};

function toView(message: {
  id: string;
  displayName: string;
  content: string;
  createdAt: Date;
  userId: string | null;
}): ForumMessageView {
  return {
    id: message.id,
    displayName: message.displayName,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    authenticated: Boolean(message.userId),
  };
}

export async function getForumMessages(input: { before?: string; limit?: number } = {}) {
  const limit = Math.min(Math.max(input.limit ?? FORUM_PAGE_SIZE, 1), FORUM_PAGE_SIZE);
  const beforeDate = input.before ? new Date(input.before) : null;
  const validBefore = beforeDate && !Number.isNaN(beforeDate.getTime()) ? beforeDate : null;

  const rows = await prisma.globalMessage.findMany({
    where: {
      moderationStatus: "VISIBLE",
      ...(validBefore ? { createdAt: { lt: validBefore } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: { id: true, displayName: true, content: true, createdAt: true, userId: true },
  });

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit).reverse();

  return {
    items: page.map(toView),
    hasMore,
    nextBefore: hasMore && page.length > 0 ? page[0]!.createdAt.toISOString() : null,
  };
}

export async function isForumSessionBanned(sessionId: string) {
  const now = new Date();
  const ban = await prisma.forumBan.findFirst({
    where: { sessionId, expiresAt: { gt: now } },
    select: { id: true, expiresAt: true, reason: true },
  });
  return ban;
}

export function forumChannel() {
  return "forum:global";
}

export function hashForumIp(ip: string) {
  const salt = process.env.FORUM_IP_SALT ?? "motormeetings-dev-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 40);
}

const cleanupState = globalThis as typeof globalThis & { __mmForumCleanupAt?: number };

export async function maybeCleanupOldForumMessages() {
  const now = Date.now();
  if (cleanupState.__mmForumCleanupAt && now - cleanupState.__mmForumCleanupAt < 60 * 60 * 1000) {
    return;
  }
  cleanupState.__mmForumCleanupAt = now;
  await cleanupOldForumMessages();
}

export async function cleanupOldForumMessages() {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await prisma.globalMessage
    .deleteMany({ where: { createdAt: { lt: cutoff }, moderationStatus: "VISIBLE" } })
    .catch(() => undefined);
}
