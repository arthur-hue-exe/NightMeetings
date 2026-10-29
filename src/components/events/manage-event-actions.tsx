"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Ban,
  Loader2,
  Pencil,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DialogKind = "cancel" | "delete" | null;

export function ManageEventActions({
  eventId,
  slug,
  title,
  status,
  expired,
}: {
  eventId: string;
  slug: string;
  title: string;
  status: "ACTIVE" | "CANCELLED";
  expired: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dialog) return;
    confirmRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) setDialog(null);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [dialog, busy]);

  async function updateStatus(next: "ACTIVE" | "CANCELLED") {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível atualizar o status do evento.");
        return;
      }
      setDialog(null);
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteEvent() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Não foi possível excluir o evento.");
        return;
      }
      setDialog(null);
      router.refresh();
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {!expired ? (
          <Link
            href={`/eventos/${slug}/editar`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3.5 text-xs font-semibold text-fog transition hover:border-brand-light/45 hover:bg-white/[0.08]"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Editar
          </Link>
        ) : null}

        {status === "ACTIVE" && !expired ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setDialog("cancel");
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 text-xs font-semibold text-amber-200 transition hover:border-amber-400/50 hover:bg-amber-500/15"
          >
            <Ban className="size-3.5" aria-hidden="true" />
            Cancelar
          </button>
        ) : null}

        {status === "CANCELLED" && !expired ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void updateStatus("ACTIVE")}
            className="inline-flex h-9 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <RotateCcw className="size-3.5" aria-hidden="true" />
            )}
            Reativar
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setError(null);
            setDialog("delete");
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-red-500/25 bg-red-500/[0.08] px-3.5 text-xs font-semibold text-red-300 transition hover:border-red-400/50 hover:bg-red-500/15"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
          Excluir
        </button>
      </div>

      {error && !dialog ? (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}

      {dialog ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-night/80 p-4 backdrop-blur-sm sm:items-center"
          onClick={(event) => {
            if (event.target === event.currentTarget && !busy) setDialog(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-dialog-title"
            aria-describedby="manage-dialog-description"
            className={cn(
              "panel w-full max-w-md rounded-[1.6rem] p-5 sm:p-6",
              dialog === "delete" ? "border-red-500/25" : "border-amber-500/25",
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl border",
                  dialog === "delete"
                    ? "border-red-500/30 bg-red-500/10 text-red-300"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-300",
                )}
              >
                <AlertTriangle className="size-5" aria-hidden="true" />
              </span>
              <button
                type="button"
                onClick={() => setDialog(null)}
                disabled={busy}
                aria-label="Fechar confirmação"
                className="rounded-full p-1.5 text-ash transition hover:bg-white/10 hover:text-fog disabled:opacity-50"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <h2 id="manage-dialog-title" className="mt-4 font-display text-2xl tracking-wide text-fog">
              {dialog === "delete" ? "Excluir este evento?" : "Cancelar este evento?"}
            </h2>
            <p id="manage-dialog-description" className="mt-2 text-sm leading-relaxed text-ash">
              {dialog === "delete" ? (
                <>
                  <strong className="text-fog">{title}</strong> será removido da sua área e do site.
                  Essa ação não pode ser desfeita.
                </>
              ) : (
                <>
                  Os detalhes de <strong className="text-fog">{title}</strong> continuam disponíveis,
                  mas o evento ficará marcado como cancelado e sairá das listas públicas.
                </>
              )}
            </p>

            {error ? (
              <p role="alert" className="mt-3 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDialog(null)}
                disabled={busy}
              >
                Voltar
              </Button>
              <Button
                ref={confirmRef}
                type="button"
                variant={dialog === "delete" ? "danger" : "primary"}
                disabled={busy}
                onClick={() => {
                  if (dialog === "delete") void deleteEvent();
                  else void updateStatus("CANCELLED");
                }}
              >
                {busy ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Processando...
                  </>
                ) : dialog === "delete" ? (
                  "Sim, excluir"
                ) : (
                  "Sim, cancelar evento"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
