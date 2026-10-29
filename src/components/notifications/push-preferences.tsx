"use client";

import { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing, LoaderCircle, ShieldAlert, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

type SupportState = "checking" | "unsupported" | "unconfigured" | "denied" | "default" | "granted";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) {
    output[index] = raw.charCodeAt(index);
  }
  return output;
}

function browserSupportsPush() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function PushPreferences({
  configured,
  publicKey,
}: {
  configured: boolean;
  publicKey: string | null;
}) {
  const [support, setSupport] = useState<SupportState>("checking");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const inspect = useCallback(async () => {
    if (!browserSupportsPush()) {
      setSupport("unsupported");
      return;
    }
    if (!configured || !publicKey) {
      setSupport("unconfigured");
      return;
    }
    if (Notification.permission === "denied") {
      setSupport("denied");
      return;
    }

    setSupport(Notification.permission === "granted" ? "granted" : "default");

    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const existing = await registration?.pushManager.getSubscription();
      setSubscribed(Boolean(existing));
    } catch {
      setSubscribed(false);
    }
  }, [configured, publicKey]);

  useEffect(() => {
    void inspect();
  }, [inspect]);

  async function enable() {
    if (busy || !publicKey) return;
    setBusy(true);
    setMessage(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setSupport("denied");
        setMessage("O navegador bloqueou as notificações. Para reativar, ajuste as permissões do site nas configurações.");
        return;
      }
      if (permission !== "granted") {
        setSupport("default");
        return;
      }

      setSupport("granted");
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }));

      const payload = subscription.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys.auth) {
        throw new Error("subscription-incomplete");
      }

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: payload.endpoint,
          keys: { p256dh: payload.keys.p256dh, auth: payload.keys.auth },
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Não foi possível salvar a inscrição.");
      }

      setSubscribed(true);
      setMessage("Notificações ativadas neste navegador. Você será avisado quando um novo rolê for publicado.");
    } catch (error) {
      setMessage(
        error instanceof Error && error.message !== "subscription-incomplete"
          ? error.message
          : "Não foi possível ativar as notificações neste navegador.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (busy) return;
    setBusy(true);
    setMessage(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        }).catch(() => undefined);
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage("Notificações push desativadas neste navegador. O sino do site continua funcionando.");
    } catch {
      setMessage("Não foi possível desativar as notificações agora. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  const status = (() => {
    if (support === "checking") return { label: "Verificando este navegador…", tone: "text-ash" };
    if (support === "unsupported") return { label: "Este navegador não oferece notificações push.", tone: "text-ash" };
    if (support === "unconfigured") return { label: "Push não configurado neste servidor.", tone: "text-amber-300" };
    if (support === "denied") return { label: "Permissão bloqueada pelo navegador.", tone: "text-red-300" };
    if (subscribed) return { label: "Ativo neste navegador.", tone: "text-emerald-300" };
    if (support === "granted") return { label: "Permissão concedida, aparelho não inscrito.", tone: "text-amber-300" };
    return { label: "Ainda não ativado.", tone: "text-ash" };
  })();

  return (
    <section aria-labelledby="push-title" className="panel rounded-3xl p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-brand/25 bg-brand/10 text-brand-light">
          <Smartphone className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 id="push-title" className="text-lg font-bold text-fog">
            Notificações push
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ash">
            Avisamos somente quando um novo rolê for publicado. A permissão é solicitada apenas quando
            você clicar em ativar — nunca ao abrir o site e sem repetir pedidos após uma recusa.
          </p>
        </div>
      </div>

      <p className={`mt-4 text-xs font-semibold ${status.tone}`} role="status">
        {status.label}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {support === "checking" ? (
          <span className="inline-flex items-center gap-2 text-xs text-ash">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Carregando preferências…
          </span>
        ) : null}

        {(support === "default" || (support === "granted" && !subscribed)) && (
          <Button type="button" size="sm" onClick={() => void enable()} disabled={busy}>
            <BellRing className="size-4" aria-hidden="true" />
            {busy ? "Ativando…" : "Ativar notificações push"}
          </Button>
        )}

        {subscribed ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => void disable()} disabled={busy}>
            <BellOff className="size-4" aria-hidden="true" />
            {busy ? "Desativando…" : "Desativar neste navegador"}
          </Button>
        ) : null}

        {support === "denied" ? (
          <p className="flex items-center gap-2 text-xs text-ash">
            <ShieldAlert className="size-4 text-red-300" aria-hidden="true" />
            O navegador bloqueou as notificações. Não insistimos automaticamente; reative nas
            configurações do site quando quiser.
          </p>
        ) : null}

        {support === "unconfigured" ? (
          <p className="text-xs text-ash">
            O servidor ainda não recebeu as chaves VAPID. O sino de notificações no site continua
            disponível.
          </p>
        ) : null}

        {support === "unsupported" ? (
          <p className="text-xs text-ash">
            Use o sino no topo da página para acompanhar novidades dentro do site.
          </p>
        ) : null}
      </div>

      {message ? (
        <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs leading-relaxed text-ash">
          {message}
        </p>
      ) : null}

      <p className="mt-4 text-[0.7rem] leading-relaxed text-ash/60">
        Push exige HTTPS em produção (ou localhost durante o desenvolvimento). As notificações nunca
        incluem o conteúdo de mensagens privadas.
      </p>
    </section>
  );
}
