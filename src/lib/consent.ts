import { cookies } from "next/headers";
import { COOKIE_CONSENT_COOKIE, COOKIE_CONSENT_VERSION } from "@/lib/constants";

export type ConsentChoices = {
  version: string;
  preferences: boolean;
  analytics: boolean;
  decided: boolean;
};

const DEFAULT: ConsentChoices = {
  version: COOKIE_CONSENT_VERSION,
  preferences: false,
  analytics: false,
  decided: false,
};

export function parseConsentCookie(value: string | undefined): ConsentChoices {
  if (!value) return DEFAULT;
  const [version, preferences, analytics] = value.split(":");
  if (version !== COOKIE_CONSENT_VERSION) return DEFAULT;
  return {
    version,
    preferences: preferences === "1",
    analytics: analytics === "1",
    decided: true,
  };
}

export async function getConsent(): Promise<ConsentChoices> {
  const store = await cookies();
  return parseConsentCookie(store.get(COOKIE_CONSENT_COOKIE)?.value);
}

export function serializeConsent(preferences: boolean, analytics: boolean) {
  return `${COOKIE_CONSENT_VERSION}:${preferences ? "1" : "0"}:${analytics ? "1" : "0"}`;
}

export const consentCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 365 * 24 * 60 * 60,
};
