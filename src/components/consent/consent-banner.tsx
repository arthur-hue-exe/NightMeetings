"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ConsentState = { preferences: boolean; analytics: boolean };

export function ConsentBanner({ decided }: { decided: boolean }) {
  const [open, setOpen] = useState(!decided);
  const [customize, setCustomize] = useState(!decided ? false : true);
  const [choices, setChoices] = useState<ConsentState>({ preferences: false, analytics: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function reopen() {
      setCustomize(true);
      setOpen(true);
      setError(null);
      try {
        const response = await fetch("/api/consent", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as {
          consent?: { preferences: boolean; analytics: boolean };
        };
        if (data.consent) {
          setChoices({ preferences: data.consent.preferences, analytics: data.consent.analytics });
        }
      } catch {
        /* mantém os valores já selecionados */
      }
    }
    window.addEventListener("mm:open-consent", reopen);
    return () => window.removeEventListener("mm:open-consent", reopen);
  }, []);

  async function save(preferences: boolean, analytics: boolean) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences, analytics }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Não foi possível salvar sua escolha.");
      }
      setChoices({ preferences, analytics });
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar sua escolha.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <section
      aria-label="Preferências de cookies"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-3xl rounded-3xl border border-brand/30 bg-night-2/97 p-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl sm:inset-x-6 sm:bottom-6 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-brand-light">
          <Cookie className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-fog">Sua privacidade importa</h2>
          <p className="mt-1 text-xs leading-relaxed text-ash">
            Usamos cookies necessários para o site funcionar (login, sessão do fórum e segurança).
            Cookies opcionais de preferências e medição só são ativados com o seu consentimento.{" "}
            <Link href="/cookies" className="font-semibold text-brand-light underline-offset-2 hover:underline">
              Saiba mais
            </Link>
            .
          </p>

          {customize ? (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <ConsentOption
                title="Necessários"
                description="Sessão, segurança e funcionamento."
                checked
                disabled
              />
              <ConsentOption
                title="Preferências"
                description="Lembrar ajustes de navegação."
                checked={choices.preferences}
                onChange={(value) => setChoices((current) => ({ ...current, preferences: value }))}
              />
              <ConsentOption
                title="Medição"
                description="Ajuda a entender o uso do site."
                checked={choices.analytics}
                onChange={(value) => setChoices((current) => ({ ...current, analytics: value }))}
              />
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="mt-3 text-xs text-red-300">
              {error}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save(true, true)}
              className="rounded-full bg-gradient-to-r from-brand to-brand-light px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              Aceitar todos
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void save(false, false)}
              className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-fog transition hover:border-brand-light/40 disabled:opacity-60"
            >
              Rejeitar opcionais
            </button>
            {customize ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void save(choices.preferences, choices.analytics)}
                className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 px-4 py-2 text-xs font-semibold text-brand-light transition hover:bg-brand/10 disabled:opacity-60"
              >
                <Settings2 className="size-3.5" aria-hidden="true" /> Salvar escolhas
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setCustomize(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-ash transition hover:text-fog disabled:opacity-60"
              >
                <Settings2 className="size-3.5" aria-hidden="true" /> Personalizar
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ConsentOption({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5",
        disabled && "cursor-default opacity-75",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange?.(event.target.checked)}
        className="mt-0.5 size-4 accent-[var(--color-brand)]"
      />
      <span className="min-w-0">
        <span className="block text-[0.72rem] font-bold text-fog">{title}</span>
        <span className="block text-[0.66rem] leading-snug text-ash">{description}</span>
      </span>
    </label>
  );
}
