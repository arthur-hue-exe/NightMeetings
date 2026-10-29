import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";
import { userChannel } from "@/lib/messaging";
import { NOTIFICATIONS_BROADCAST_CHANNEL } from "@/lib/notifications";
import { sseResponse } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para receber notificações.", 401);

  return sseResponse(request, [userChannel(user.id), NOTIFICATIONS_BROADCAST_CHANNEL]);
}
