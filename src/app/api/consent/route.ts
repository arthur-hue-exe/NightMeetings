import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { ensureAnonymousSession } from "@/lib/anonymous";
import { fieldErrors, isSameOrigin, jsonError, validationMessage } from "@/lib/api";
import {
  consentCookieOptions,
  getConsent,
  serializeConsent,
} from "@/lib/consent";
import { prisma } from "@/lib/db";
import { COOKIE_CONSENT_COOKIE, COOKIE_CONSENT_VERSION } from "@/lib/constants";
import { cookieConsentSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const consent = await getConsent();
  return NextResponse.json({ ok: true, consent }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler os dados enviados.", 400);
  }

  const parsed = cookieConsentSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(validationMessage(parsed.error), 422, {
      fieldErrors: fieldErrors(parsed.error),
    });
  }

  const user = await getCurrentUser();
  const session = user ? null : await ensureAnonymousSession();

  const store = await cookies();
  store.set(
    COOKIE_CONSENT_COOKIE,
    serializeConsent(parsed.data.preferences, parsed.data.analytics),
    consentCookieOptions,
  );

  try {
    await prisma.cookieConsent.create({
      data: {
        userId: user?.id ?? null,
        anonymousSessionId: session?.id ?? null,
        consentVersion: COOKIE_CONSENT_VERSION,
        necessary: true,
        preferences: parsed.data.preferences,
        analytics: parsed.data.analytics,
      },
    });
  } catch (error) {
    console.error("Falha ao registrar consentimento", error);
  }

  const consent = await getConsent();
  return NextResponse.json({ ok: true, consent });
}
