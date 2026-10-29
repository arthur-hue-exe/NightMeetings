import { prisma } from "@/lib/db";
import { MESSAGE_PAGE_SIZE } from "@/lib/constants";
import { publish } from "@/lib/realtime";

export type ConversationSummary = {
  id: string;
  type: "DIRECT" | "GROUP";
  title: string;
  imageUrl: string | null;
  status: "ACTIVE" | "CLOSED";
  memberCount: number;
  unread: number;
  lastMessage: { content: string; createdAt: string; senderName: string } | null;
  updatedAt: string;
};

export type MessageView = {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  own: boolean;
};

function conversationTitle(
  conversation: {
    type: string;
    name: string | null;
    members: Array<{ userId: string; user: { name: string } }>;
  },
  viewerId: string,
) {
  if (conversation.type === "GROUP") return conversation.name ?? "Grupo privado";
  const other = conversation.members.find((member) => member.userId !== viewerId);
  return other?.user.name ?? "Conversa privada";
}

export async function getUserConversations(userId: string): Promise<ConversationSummary[]> {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          members: { include: { user: { select: { id: true, name: true } } } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: { sender: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  const items = await Promise.all(
    memberships.map(async (membership) => {
      const conversation = membership.conversation;
      const last = conversation.messages[0] ?? null;
      const unread = await prisma.privateMessage.count({
        where: {
          conversationId: conversation.id,
          senderId: { not: userId },
          ...(membership.lastReadAt ? { createdAt: { gt: membership.lastReadAt } } : {}),
        },
      });
      return {
        id: conversation.id,
        type: conversation.type as "DIRECT" | "GROUP",
        title: conversationTitle(conversation, userId),
        imageUrl: conversation.imageUrl,
        status: conversation.status as "ACTIVE" | "CLOSED",
        memberCount: conversation.members.length,
        unread,
        lastMessage: last
          ? {
              content: last.content,
              createdAt: last.createdAt.toISOString(),
              senderName: last.sender.name,
            }
          : null,
        updatedAt: (last?.createdAt ?? conversation.updatedAt).toISOString(),
      } satisfies ConversationSummary;
    }),
  );

  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getConversationForUser(conversationId: string, userId: string) {
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    include: {
      conversation: {
        include: {
          createdBy: { select: { id: true, name: true } },
          members: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
    },
  });

  if (!membership) return null;

  return {
    membership,
    conversation: membership.conversation,
    title: conversationTitle(membership.conversation, userId),
  };
}

export async function getConversationMessages(input: {
  conversationId: string;
  userId: string;
  before?: string;
  limit?: number;
}) {
  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: input.conversationId, userId: input.userId } },
    select: { id: true },
  });
  if (!membership) return null;

  const limit = Math.min(Math.max(input.limit ?? MESSAGE_PAGE_SIZE, 1), MESSAGE_PAGE_SIZE);
  const beforeDate = input.before ? new Date(input.before) : null;
  const validBefore = beforeDate && !Number.isNaN(beforeDate.getTime()) ? beforeDate : null;

  const rows = await prisma.privateMessage.findMany({
    where: {
      conversationId: input.conversationId,
      ...(validBefore ? { createdAt: { lt: validBefore } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    include: { sender: { select: { id: true, name: true } } },
  });

  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit).reverse();

  const items: MessageView[] = page.map((message) => ({
    id: message.id,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    senderId: message.senderId,
    senderName: message.sender.name,
    own: message.senderId === input.userId,
  }));

  return {
    items,
    hasMore,
    nextBefore: hasMore && items.length > 0 ? items[0]!.createdAt : null,
  };
}

export async function markConversationRead(conversationId: string, userId: string) {
  await prisma.conversationMember.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: new Date() },
  });
}

export function userChannel(userId: string) {
  return `user:${userId}`;
}

export async function getConversationMembership(conversationId: string, userId: string) {
  return prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
    select: {
      id: true,
      role: true,
      conversation: {
        select: { id: true, type: true, status: true, name: true, createdById: true },
      },
    },
  });
}

export function isConversationManager(
  conversation: { type: string; createdById: string },
  role: string,
  userId: string,
) {
  return conversation.type === "GROUP" && (role === "ADMIN" || conversation.createdById === userId);
}

export function notifyConversationChanged(userIds: string[], conversationId: string) {
  for (const userId of new Set(userIds)) {
    publish(userChannel(userId), "conversation", { conversationId });
  }
}
