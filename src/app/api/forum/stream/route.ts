import { forumChannel } from "@/lib/forum";
import { sseResponse } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return sseResponse(request, [forumChannel()]);
}
