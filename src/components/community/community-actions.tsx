"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, EyeOff, Flag, Loader2, Pencil, Power, Trash2 } from "lucide-react";

export function CommunityManageActions({
  communityId,
  slug,
  status,
}: {
  communityId: string;
  slug: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function changeStatus() {
    setBusy("status");
    setError(null);
    try {
      const next = status === "ACTIVE" ? "DISABLED" : "ACTIVE";
      const response = await fetch(`/api/communities/${communityId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível alterar o status.");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível alterar o status.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setError(null);
    try {
      const response = await fetch(`/api/communities/${communityId}`, { method: "DELETE" });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível excluir a comunidade.");
      router.push("/comunidade?aba=grupos");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível excluir a comunidade.");
      setBusy(null);
    }
  }

  return (
    <div className="panel rounded-2xl p-4">
      <h2 className="text-xs font-bold uppercase tracking-wide text-ash">Gerenciar comunidade</h2>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link
          href={`/comunidade/${slug}/editar`}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-fog transition hover:border-brand-light/40"
        >
          <Pencil className="size-3.5" aria-hidden="true" /> Editar
        </Link>
        <button
          type="button"
          onClick={() => void changeStatus()}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-fog transition hover:border-brand-light/40 disabled:opacity-60"
        >
          {busy === "status" ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : status === "ACTIVE" ? (
            <EyeOff className="size-3.5" aria-hidden="true" />
          ) : (
            <Power className="size-3.5" aria-hidden="true" />
          )}
          {status === "ACTIVE" ? "Desativar" : "Reativar"}
        </button>

        {confirming ? (
          <span className="inline-flex flex-wrap items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1.5">
            <span className="text-[0.68rem] font-semibold text-red-200">Excluir mesmo?</span>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy !== null}
              className="rounded-full bg-red-500/20 px-2.5 py-1 text-[0.66rem] font-bold text-red-200 transition hover:bg-red-500/30 disabled:opacity-60"
            >
              {busy === "delete" ? "Excluindo…" : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-[0.66rem] font-semibold text-ash hover:text-fog"
            >
              Cancelar
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 px-3.5 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
          >
            <Trash2 className="size-3.5" aria-hidden="true" /> Excluir
          </button>
        )}
      </div>
      <p className="mt-2 text-[0.66rem] leading-relaxed text-ash/70">
        Desativar ou excluir remove a comunidade das listagens públicas e desativa o botão do WhatsApp.
      </p>
      {error ? (
        <p role="alert" className="mt-2 flex items-center gap-1 text-[0.66rem] text-red-300">
          <AlertCircle className="size-3 shrink-0" aria-hidden="true" /> {error}
        </p>
      ) : null}
    </div>
  );
}

const REASONS = [
  { value: "SPAM", label: "Spam ou divulgação repetida" },
  { value: "ABUSO", label: "Abuso ou ofensa" },
  { value: "CONTEUDO_INADEQUADO", label: "Conteúdo inadequado" },
  { value: "GOLPE", label: "Golpe ou fraude" },
  { value: "OUTRO", label: "Outro motivo" },
];

export function CommunityReportButton({ communityId }: { communityId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("SPAM");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/forum/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType: "COMMUNITY", targetId: communityId, reason, details }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível registrar a denúncia.");
      setDone(true);
      setOpen(false);
    } catch (reasonValue) {
      setError(reasonValue instanceof Error ? reasonValue.message : "Não foi possível registrar a denúncia.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return <p className="text-[0.68rem] text-emerald-300">Denúncia registrada. A moderação vai revisar.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[0.68rem] font-semibold text-ash/70 transition hover:text-red-300"
      >
        <Flag className="size-3" aria-hidden="true" /> Denunciar comunidade
      </button>
    );
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <p className="text-xs font-bold text-fog">Denunciar comunidade</p>
      <label className="mt-2 block text-[0.68rem] font-semibold text-ash">
        Motivo
        <select
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 w-full rounded-lg border border-white/12 bg-night px-2 py-1.5 text-xs text-fog"
        >
          {REASONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-2 block text-[0.68rem] font-semibold text-ash">
        Detalhes (opcional)
        <textarea
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          maxLength={300}
          rows={2}
          className="mt-1 w-full resize-none rounded-lg border border-white/12 bg-night px-2 py-1.5 text-xs text-fog"
        />
      </label>
      {error ? (
        <p role="alert" className="mt-2 text-[0.66rem] text-red-300">
          {error}
        </p>
      ) : null}
      <div className="mt-2 flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-brand px-3 py-1.5 text-[0.68rem] font-bold text-white disabled:opacity-60"
        >
          {busy ? "Enviando…" : "Enviar denúncia"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[0.68rem] font-semibold text-ash hover:text-fog"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
