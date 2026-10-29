"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signInAction, signUpAction, type AuthActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";

function PasswordInput({
  id,
  name,
  autoComplete,
  invalid,
  describedBy,
  placeholder,
}: {
  id: string;
  name: string;
  autoComplete: string;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={id === "password" || id === "confirmPassword" ? 8 : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        placeholder={placeholder}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-ash transition hover:bg-white/10 hover:text-fog"
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

export function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "register";
  next: string;
}) {
  const isRegister = mode === "register";
  const action = isRegister ? signUpAction : signInAction;
  const [state, formAction, pending] = useActionState<AuthActionState, FormData>(action, null);

  const fieldError = (name: string) => state?.fieldErrors?.[name];

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />

      {state?.error ? <FormError>{state.error}</FormError> : null}

      {isRegister ? (
        <Field
          label="Nome ou apelido"
          htmlFor="name"
          required
          error={fieldError("name")}
          hint="aparece nos seus eventos"
        >
          <Input
            id="name"
            name="name"
            autoComplete="nickname"
            required
            minLength={2}
            maxLength={40}
            aria-invalid={Boolean(fieldError("name")) || undefined}
            aria-describedby={fieldError("name") ? "name-error" : undefined}
            placeholder="Como a galera te chama?"
          />
        </Field>
      ) : null}

      <Field label="E-mail" htmlFor="email" required error={fieldError("email")}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={160}
          aria-invalid={Boolean(fieldError("email")) || undefined}
          aria-describedby={fieldError("email") ? "email-error" : undefined}
          placeholder="voce@exemplo.com"
        />
      </Field>

      <Field
        label="Senha"
        htmlFor="password"
        required
        error={fieldError("password")}
        hint={isRegister ? "mínimo de 8 caracteres" : undefined}
      >
        <PasswordInput
          id="password"
          name="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          invalid={Boolean(fieldError("password"))}
          describedBy={fieldError("password") ? "password-error" : undefined}
          placeholder="••••••••"
        />
      </Field>

      {isRegister ? (
        <Field
          label="Confirmar senha"
          htmlFor="confirmPassword"
          required
          error={fieldError("confirmPassword")}
        >
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            autoComplete="new-password"
            invalid={Boolean(fieldError("confirmPassword"))}
            describedBy={fieldError("confirmPassword") ? "confirmPassword-error" : undefined}
            placeholder="Repita a senha"
          />
        </Field>
      ) : null}

      <Button type="submit" size="lg" className="mt-2 w-full" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
        {pending
          ? isRegister
            ? "Criando conta…"
            : "Entrando…"
          : isRegister
            ? "Criar minha conta"
            : "Entrar"}
      </Button>

      {isRegister ? (
        <p className="text-center text-[0.7rem] leading-relaxed text-ash">
          Ao criar sua conta, você concorda com os{" "}
          <Link href="/termos" className="text-brand-light underline-offset-2 hover:underline">
            Termos de uso
          </Link>{" "}
          e a{" "}
          <Link href="/privacidade" className="text-brand-light underline-offset-2 hover:underline">
            Política de privacidade
          </Link>
          .
        </p>
      ) : null}

      <p className={cn("pt-1 text-center text-sm text-ash")}>
        {isRegister ? "Já tem uma conta?" : "Ainda não tem conta?"}{" "}
        <Link
          href={`${isRegister ? "/entrar" : "/cadastrar"}${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-fog underline decoration-brand/50 underline-offset-4 transition hover:text-brand-light"
        >
          {isRegister ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </form>
  );
}
