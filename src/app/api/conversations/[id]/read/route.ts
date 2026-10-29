import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin, jsonError } from "@/lib/api";
import { getConversationMembership, markConversationRead } from "@/lib/messaging";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para acessar as mensagens.", 401);

  const { id } = await params;
  const membership = await getConversationMembership(id, user.id);
  if (!membership) return jsonError("Conversa não encontrada.", 404);

  await markConversationRead(id, user.id);
  return NextResponse.json({ ok: true });
}
