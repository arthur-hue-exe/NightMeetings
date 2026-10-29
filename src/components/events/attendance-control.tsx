"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, UserCheck, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function attendanceLabel(count: number) {
  if (count === 0) return "Nenhuma presença confirmada";
  if (count === 1) return "1 pessoa confirmou presença";
  return `${count} pessoas confirmaram presença`;
}

type AttendanceResponse = {
  ok?: boolean;
  attending?: boolean;
  count?: number;
  error?: string;
};

export function AttendanceControl({
  eventId,
  slug,
  initialAttending,
  initialCount,
  authenticated,
  disabled = false,
  disabledLabel = "Confirmações encerradas",
  layout = "card",
  className,
}: {
  eventId: string;
  slug: string;
  initialAttending: boolean;
  initialCount: number;
  authenticated: boolean;
  disabled?: boolean;
  disabledLabel?: string;
  layout?: "card" | "detail";
  className?: string;
}) {
  const router = useRouter();
  const [attending, setAttending] = useState(initialAttending);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const pendingRef = useRef(false);

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  useEffect(() => {
    if (layout !== "detail") return;

    async function refresh() {
      if (document.visibilityState !== "visible" || pendingRef.current) return;
      try {
        const response = await fetch(`/api/events/${eventId}/attendance`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const data = (await response.json().catch(() => null)) as AttendanceResponse | null;
        if (!response.ok || !data?.ok || typeof data.count !== "number") return;
        setCount(data.count);
        setAttending(Boolean(data.attending));
      } catch {
        // Contagem secundária: uma falha de rede não deve interromper a página.
      }
    }

    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [eventId, layout]);

  async function updateAttendance(next: boolean) {
    if (pending || disabled) return;

    if (!authenticated) {
      router.push(`/entrar?next=${encodeURIComponent(`/eventos/${slug}`)}`);
      return;
    }

    const previous = { attending, count };
    pendingRef.current = true;
    setPending(true);
    setError(null);
    setStatus("");
    setAttending(next);
    setCount((current) => Math.max(0, current + (next ? 1 : -1)));

    try {
      const response = await fetch(`/api/events/${eventId}/attendance`, {
        method: next ? "POST" : "DELETE",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = (await response.json().catch(() => null)) as AttendanceResponse | null;

      if (!response.ok || !data?.ok || typeof data.count !== "number") {
        throw new Error(data?.error || "Não foi possível atualizar sua presença.");
      }

      setAttending(Boolean(data.attending));
      setCount(data.count);
      setStatus(next ? "Presença confirmada." : "Presença cancelada.");
    } catch (cause) {
      setAttending(previous.attending);
      setCount(previous.count);
      setError(
        cause instanceof Error && cause.message
          ? cause.message
          : "Falha de conexão. Verifique sua internet e tente novamente.",
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  const isDetail = layout === "detail";

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <p
        className={cn(
          "flex items-center gap-1.5 text-ash",
          isDetail ? "text-sm" : "text-xs",
        )}
        aria-live="polite"
      >
        <Users
          className={cn("shrink-0 text-brand-light/80", isDetail ? "size-4" : "size-3.5")}
          aria-hidden="true"
        />
        <span className={count > 0 ? "font-semibold text-fog" : undefined}>
          {attendanceLabel(count)}
        </span>
      </p>

      {disabled ? (
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ash/70">
          {disabledLabel}
        </p>
      ) : attending ? (
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-emerald-400/35 bg-emerald-400/10 font-semibold text-emerald-200",
              isDetail ? "h-11 px-5 text-sm" : "h-9 px-4 text-xs",
            )}
          >
            <Check className={isDetail ? "size-4" : "size-3.5"} aria-hidden="true" />
            Presença confirmada
          </span>
          <Button
            type="button"
            variant="ghost"
            size={isDetail ? "md" : "sm"}
            onClick={() => updateAttendance(false)}
            disabled={pending}
            aria-label="Cancelar presença"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <X className="size-4" aria-hidden="true" />
            )}
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="primary"
          size={isDetail ? "md" : "sm"}
          onClick={() => updateAttendance(true)}
          disabled={pending}
          className="w-full"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserCheck className="size-4" aria-hidden="true" />
          )}
          {pending ? "Confirmando..." : "Confirmar presença"}
        </Button>
      )}

      {error ? (
        <p role="alert" className="text-xs leading-relaxed text-red-300">
          {error}
        </p>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
