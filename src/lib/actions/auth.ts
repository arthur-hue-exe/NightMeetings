"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema, registerSchema } from "@/lib/validation";
import { safeNextPath } from "@/lib/utils";

export type AuthActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
} | null;

function fieldErrorsFrom(issues: Array<{ path: PropertyKey[]; message: string }>) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);
  const limit = rateLimit(`signup:${ip}`, 8, 60 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Muitas tentativas de cadastro. Aguarde alguns minutos e tente novamente." };
  }

  const next = safeNextPath(String(formData.get("next") ?? "/eventos"));
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const parsed = registerSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return {
      error: "Revise os campos destacados.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  if (parsed.data.password !== confirmPassword) {
    return {
      error: "As senhas não conferem.",
      fieldErrors: { confirmPassword: "As senhas não conferem." },
    };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });

  if (existing) {
    return {
      error: "Já existe uma conta com este e-mail. Tente entrar.",
      fieldErrors: { email: "E-mail já cadastrado." },
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
    select: { id: true },
  });

  await createSession(user.id);
  redirect(next);
}

export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const requestHeaders = await headers();
  const ip = getClientIp(requestHeaders);
  const limit = rateLimit(`login:${ip}`, 12, 15 * 60 * 1000);
  if (!limit.ok) {
    return { error: "Muitas tentativas de login. Aguarde alguns minutos e tente novamente." };
  }

  const next = safeNextPath(String(formData.get("next") ?? "/eventos"));
  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return {
      error: "Informe um e-mail e uma senha válidos.",
      fieldErrors: fieldErrorsFrom(parsed.error.issues),
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, passwordHash: true },
  });

  const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;

  if (!user || !valid) {
    await new Promise((resolve) => setTimeout(resolve, 220));
    return { error: "E-mail ou senha incorretos." };
  }

  await prisma.session.deleteMany({
    where: { userId: user.id, expiresAt: { lt: new Date() } },
  });

  await createSession(user.id);
  redirect(next);
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}
