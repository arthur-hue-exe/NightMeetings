import { prisma } from "@/lib/db";
import { sendPushToAll } from "@/lib/push";
import { publish } from "@/lib/realtime";

export const NOTIFICATIONS_BROADCAST_CHANNEL = "notifications:all";

function publishNotification(
  userId: string,
  payload: { type: string; title: string; body: string; targetUrl: string },
) {
  publish(`user:${userId}`, "notification", payload);
}

type NewEvent = { id: string; title: string; slug: string; city: string; userId: string };

export async function notifyNewEvent(event: NewEvent) {
  const claim = await prisma.event.updateMany({
    where: { id: event.id, notifiedAt: null },
    data: { notifiedAt: new Date() },
  });
  if (claim.count === 0) return { skipped: true };

  const recipients = await prisma.user.findMany({
    where: { id: { not: event.userId } },
    select: { id: true },
  });

  if (recipients.length > 0) {
    await prisma.notification.createMany({
      data: recipients.map((recipient) => ({
        userId: recipient.id,
        type: "NEW_EVENT",
        title: "Novo rolê no MotorMeetings!",
        body: `${event.title} foi publicado em ${event.city}. Confira os detalhes.`,
        targetUrl: `/eventos/${event.slug}`,
      })),
    });
    publish(NOTIFICATIONS_BROADCAST_CHANNEL, "notification", {
      type: "NEW_EVENT",
      title: "Novo rolê no MotorMeetings!",
      body: `${event.title} foi publicado em ${event.city}. Confira os detalhes.`,
      targetUrl: `/eventos/${event.slug}`,
    });
  }

  const push = await sendPushToAll({
    title: "Novo rolê no MotorMeetings!",
    body: `${event.title} foi publicado em ${event.city}. Confira os detalhes.`,
    url: `/eventos/${event.slug}`,
    tag: `event:${event.id}`,
  }).catch((error) => {
    console.error("Falha ao enviar push de novo evento", error);
    return { sent: 0, removed: 0 };
  });

  return { skipped: false, notifications: recipients.length, push };
}

export async function notifyPrivateMessage(input: {
  conversationId: string;
  senderId: string;
  senderName: string;
  memberIds: string[];
}) {
  const targets = input.memberIds.filter((id) => id !== input.senderId);
  if (targets.length === 0) return;

  await prisma.notification.createMany({
    data: targets.map((userId) => ({
      userId,
      type: "PRIVATE_MESSAGE",
      title: `Nova mensagem de ${input.senderName}`,
      body: "Você recebeu uma nova mensagem privada.",
      targetUrl: `/comunidade?aba=mensagens&c=${input.conversationId}`,
    })),
  });

  for (const userId of targets) {
    publishNotification(userId, {
      type: "PRIVATE_MESSAGE",
      title: `Nova mensagem de ${input.senderName}`,
      body: "Você recebeu uma nova mensagem privada.",
      targetUrl: `/comunidade?aba=mensagens&c=${input.conversationId}`,
    });
  }
}

export async function notifyGroupAdded(input: {
  conversationId: string;
  groupName: string;
  addedById: string;
  addedByName: string;
  userIds: string[];
}) {
  if (input.userIds.length === 0) return;
  await prisma.notification.createMany({
    data: input.userIds.map((userId) => ({
      userId,
      type: "GROUP_ADDED",
      title: "Você entrou em um grupo privado",
      body: `${input.addedByName} adicionou você ao grupo ${input.groupName}.`,
      targetUrl: `/comunidade?aba=mensagens&c=${input.conversationId}`,
    })),
  });

  for (const userId of input.userIds) {
    publishNotification(userId, {
      type: "GROUP_ADDED",
      title: "Você entrou em um grupo privado",
      body: `${input.addedByName} adicionou você ao grupo ${input.groupName}.`,
      targetUrl: `/comunidade?aba=mensagens&c=${input.conversationId}`,
    });
  }
}

export async function notifyGroupUpdated(input: {
  conversationId: string;
  title: string;
  body: string;
  userIds: string[];
}) {
  if (input.userIds.length === 0) return;
  await prisma.notification.createMany({
    data: input.userIds.map((userId) => ({
      userId,
      type: "GROUP_UPDATED",
      title: input.title,
      body: input.body,
      targetUrl: `/comunidade?aba=mensagens&c=${input.conversationId}`,
    })),
  });

  for (const userId of input.userIds) {
    publishNotification(userId, {
      type: "GROUP_UPDATED",
      title: input.title,
      body: input.body,
      targetUrl: `/comunidade?aba=mensagens&c=${input.conversationId}`,
    });
  }
}

export async function unreadNotificationCount(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}
