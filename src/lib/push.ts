import webpush from "web-push";
import type { PushSubscription as WebPushSubscription } from "web-push";
import { prisma } from "@/lib/db";

let configured = false;

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:contato@motormeetings.local";

if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (error) {
    console.error("VAPID configuration failed", error);
  }
}

export function isPushConfigured() {
  return configured;
}

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

type StoredSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function deliver(subscriptions: StoredSubscription[], payload: PushPayload) {
  if (!configured || subscriptions.length === 0) {
    return { sent: 0, removed: 0 };
  }

  const invalidIds: string[] = [];
  let sent = 0;

  await Promise.all(
    subscriptions.map(async (subscription) => {
      const target: WebPushSubscription = {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      };
      try {
        await webpush.sendNotification(target, JSON.stringify(payload), { TTL: 3600 });
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) invalidIds.push(subscription.id);
      }
    }),
  );

  if (invalidIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: invalidIds } } }).catch(() => undefined);
  }

  return { sent, removed: invalidIds.length };
}

export async function sendPushToAll(payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    select: { id: true, endpoint: true, p256dh: true, auth: true },
    take: 5000,
  });
  return deliver(subscriptions, payload);
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  return deliver(subscriptions, payload);
}
