"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BellOff,
  CheckCircle2,
  ExternalLink,
  Flag,
  Gavel,
  LoaderCircle,
  RotateCcw,
  ShieldOff,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ReportMessage = {
  id: string;
  displayName: string;
  content: string;
  createdAt: string;
  sessionId: string;
  moderationStatus: string;
};

type ReportCommunity = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

type ReportItem = {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
  message: ReportMessage | null;
  community: ReportCommunity | null;
};

type BanItem = {
  id: string;
  sessionId: string;
  nickname: string;
  reason: string;
  expiresAt: string;
  createdAt: string;
};

type LogItem = {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  notes: string | null;
  actorName: string;
  createdAt: string;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_FILTERS = [
  { value: "PENDING", label: "Pendentes" },
  { value: "RESOLVED", label: "Resolvidas" },
  { value: "DISMISSED", label: "Descartadas" },
  { value: "ALL", label: "Todas" },
] as const;

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? "Ação não concluída. Tente novamente.";
}

export function ModerationPanel() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["value"]>("PENDING");
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [bans, setBans] = useState<BanItem[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [banFormId, setBanFormId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState("Conteúdo inadequado no fórum");
  const [banHours, setBanHours] = useState(24);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [reportsResponse, bansResponse, logsResponse] = await Promise.all([
        fetch(`/api/admin/reports?status=${statusFilter}`, { cache: "no-store" }),
        fetch("/api/admin/forum/bans", { cache: "no-store" }),
        fetch("/api/admin/logs", { cache: "no-store" }),
      ]);

      if (reportsResponse.ok) {
        const data = (await reportsResponse.json()) as { reports?: ReportItem[] };
        setReports(data.reports ?? []);
      }
      if (bansResponse.ok) {
        const data = (await bansResponse.json()) as { bans?: BanItem[] };
        setBans(data.bans ?? []);
      }
      if (logsResponse.ok) {
        const data = (await logsResponse.json()) as { logs?: LogItem[] };
        setLogs(data.logs ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function decide(report: ReportItem, action: "RESOLVE" | "DISMISS", hideContent = false) {
    if (busyId) return;
    setBusyId(report.id);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/reports/${report.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, hideContent }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setNotice({
        tone: "ok",
        text:
          action === "RESOLVE"
            ? hideContent
              ? "Conteúdo ocultado e denúncia resolvida."
              : "Denúncia marcada como resolvida."
            : "Denúncia descartada.",
      });
      await refresh();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Ação não concluída." });
    } finally {
      setBusyId(null);
    }
  }

  async function toggleMessage(message: ReportMessage) {
    if (busyId) return;
    setBusyId(message.id);
    setNotice(null);
    try {
      const nextStatus = message.moderationStatus === "HIDDEN" ? "VISIBLE" : "HIDDEN";
      const response = await fetch(`/api/admin/forum/messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setNotice({
        tone: "ok",
        text: nextStatus === "HIDDEN" ? "Mensagem ocultada do fórum." : "Mensagem restaurada no fórum.",
      });
      await refresh();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Ação não concluída." });
    } finally {
      setBusyId(null);
    }
  }

  async function toggleCommunity(community: ReportCommunity) {
    if (busyId) return;
    setBusyId(community.id);
    setNotice(null);
    try {
      const nextStatus = community.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
      const response = await fetch(`/api/admin/communities/${community.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setNotice({
        tone: "ok",
        text: nextStatus === "DISABLED" ? "Comunidade desativada." : "Comunidade reativada.",
      });
      await refresh();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Ação não concluída." });
    } finally {
      setBusyId(null);
    }
  }

  async function banSession(report: ReportItem) {
    if (!report.message || busyId) return;
    const reason = banReason.trim();
    if (reason.length < 3) {
      setNotice({ tone: "error", text: "Descreva o motivo da suspensão." });
      return;
    }

    setBusyId(report.id);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/forum/bans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: report.message.sessionId, reason, hours: banHours }),
      });
      if (!response.ok) throw new Error(await readError(response));
      setNotice({ tone: "ok", text: `Sessão suspensa por ${banHours}h.` });
      setBanFormId(null);
      await refresh();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Ação não concluída." });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <p
          role="status"
          className={cn(
            "rounded-2xl border px-4 py-3 text-sm",
            notice.tone === "ok"
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-400/30 bg-red-500/10 text-red-200",
          )}
        >
          {notice.text}
        </p>
      ) : null}

      <section aria-labelledby="reports-title" className="panel rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
          <div>
            <h2 id="reports-title" className="flex items-center gap-2 text-lg font-bold text-fog">
              <Flag className="size-4 text-brand-light" aria-hidden="true" /> Fila de denúncias
            </h2>
            <p className="mt-0.5 text-xs text-ash">
              Revise o conteúdo, oculte o que violar as regras e registre a decisão.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar denúncias por status">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatusFilter(filter.value)}
                aria-pressed={statusFilter === filter.value}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                  statusFilter === filter.value
                    ? "bg-brand text-white"
                    : "border border-white/10 bg-white/[0.03] text-ash hover:text-fog",
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {loading && reports.length === 0 ? (
          <p className="flex items-center gap-2 px-5 py-8 text-sm text-ash">
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Carregando denúncias…
          </p>
        ) : reports.length === 0 ? (
          <p className="px-5 py-8 text-sm text-ash">Nenhuma denúncia neste filtro.</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {reports.map((report) => {
              const busy = busyId === report.id || busyId === report.message?.id || busyId === report.community?.id;
              return (
                <li key={report.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.12em]">
                    <span className="rounded-full border border-brand/35 bg-brand/10 px-2 py-0.5 text-brand-light">
                      {report.targetType === "GLOBAL_MESSAGE" ? "Fórum" : "Comunidade"}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5",
                        report.status === "PENDING"
                          ? "border border-amber-400/35 bg-amber-500/10 text-amber-300"
                          : report.status === "RESOLVED"
                            ? "border border-emerald-400/35 bg-emerald-500/10 text-emerald-300"
                            : "border border-white/15 bg-white/[0.04] text-ash",
                      )}
                    >
                      {report.status === "PENDING"
                        ? "Pendente"
                        : report.status === "RESOLVED"
                          ? "Resolvida"
                          : "Descartada"}
                    </span>
                    <span className="text-ash/60">{dateFormatter.format(new Date(report.createdAt))}</span>
                  </div>

                  <p className="mt-2 text-sm text-fog">
                    <strong className="font-semibold">Motivo:</strong> {report.reason}
                    {report.details ? <span className="block text-xs text-ash">{report.details}</span> : null}
                  </p>

                  {report.message ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-night/60 p-3">
                      <p className="flex flex-wrap items-center gap-2 text-[0.68rem] font-semibold text-ash">
                        {report.message.displayName}
                        <span className="text-ash/50">
                          {dateFormatter.format(new Date(report.message.createdAt))}
                        </span>
                        {report.message.moderationStatus === "HIDDEN" ? (
                          <span className="rounded-full border border-red-400/35 bg-red-500/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-red-300">
                            Oculta
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-fog">
                        {report.message.content}
                      </p>
                    </div>
                  ) : null}

                  {report.community ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-night/60 p-3 text-sm">
                      <Link
                        href={`/comunidade/${report.community.slug}`}
                        className="inline-flex items-center gap-1 font-semibold text-brand-light hover:underline"
                      >
                        {report.community.name}
                        <ExternalLink className="size-3.5" aria-hidden="true" />
                      </Link>
                      <span className="text-[0.66rem] uppercase tracking-wide text-ash">
                        {report.community.status === "ACTIVE" ? "Ativa" : "Desativada"}
                      </span>
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {report.status === "PENDING" ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => void decide(report, "RESOLVE", Boolean(report.message))}
                        >
                          <CheckCircle2 className="size-4" aria-hidden="true" />
                          {report.message ? "Ocultar e resolver" : "Resolver"}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          onClick={() => void decide(report, "DISMISS")}
                        >
                          <XCircle className="size-4" aria-hidden="true" /> Descartar
                        </Button>
                        {report.message ? (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={busy}
                            onClick={() => void toggleMessage(report.message!)}
                          >
                            <RotateCcw className="size-4" aria-hidden="true" />
                            {report.message.moderationStatus === "HIDDEN" ? "Restaurar" : "Ocultar só"}
                          </Button>
                        ) : null}
                        {report.community ? (
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            disabled={busy}
                            onClick={() => void toggleCommunity(report.community!)}
                          >
                            <ShieldOff className="size-4" aria-hidden="true" />
                            {report.community.status === "ACTIVE" ? "Desativar comunidade" : "Reativar comunidade"}
                          </Button>
                        ) : null}
                        {report.message ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={busy}
                            onClick={() => setBanFormId((current) => (current === report.id ? null : report.id))}
                            aria-expanded={banFormId === report.id}
                          >
                            <Gavel className="size-4" aria-hidden="true" /> Suspender sessão
                          </Button>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-xs text-ash">
                        Revisada em {report.reviewedAt ? dateFormatter.format(new Date(report.reviewedAt)) : "—"}.
                      </p>
                    )}
                  </div>

                  {banFormId === report.id && report.message ? (
                    <div className="mt-3 grid gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[1fr_120px_auto]">
                      <label className="text-xs text-ash">
                        <span className="mb-1 block font-semibold text-fog">Motivo</span>
                        <input
                          value={banReason}
                          onChange={(event) => setBanReason(event.target.value)}
                          maxLength={200}
                          className="w-full rounded-xl border border-white/12 bg-night px-3 py-2 text-sm text-fog outline-none focus:border-brand-light/60"
                        />
                      </label>
                      <label className="text-xs text-ash">
                        <span className="mb-1 block font-semibold text-fog">Horas</span>
                        <input
                          type="number"
                          min={1}
                          max={720}
                          value={banHours}
                          onChange={(event) => setBanHours(Number(event.target.value) || 24)}
                          className="w-full rounded-xl border border-white/12 bg-night px-3 py-2 text-sm text-fog outline-none focus:border-brand-light/60"
                        />
                      </label>
                      <div className="flex items-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => void banSession(report)}
                        >
                          <BellOff className="size-4" aria-hidden="true" /> Suspender
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setBanFormId(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.45fr_0.55fr]">
        <section aria-labelledby="bans-title" className="panel rounded-3xl">
          <div className="border-b border-white/8 px-5 py-4">
            <h2 id="bans-title" className="flex items-center gap-2 text-lg font-bold text-fog">
              <Gavel className="size-4 text-brand-light" aria-hidden="true" /> Suspensões ativas
            </h2>
            <p className="mt-0.5 text-xs text-ash">Sessões anônimas temporariamente impedidas de postar.</p>
          </div>
          {bans.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ash">Nenhuma suspensão ativa.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {bans.map((ban) => (
                <li key={ban.id} className="px-5 py-3 text-sm">
                  <p className="font-semibold text-fog">{ban.nickname}</p>
                  <p className="text-xs text-ash">{ban.reason}</p>
                  <p className="mt-1 text-[0.62rem] uppercase tracking-wide text-ash/60">
                    Até {dateFormatter.format(new Date(ban.expiresAt))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="logs-title" className="panel rounded-3xl">
          <div className="border-b border-white/8 px-5 py-4">
            <h2 id="logs-title" className="text-lg font-bold text-fog">
              Registro de moderação
            </h2>
            <p className="mt-0.5 text-xs text-ash">Últimas ações administrativas registradas.</p>
          </div>
          {logs.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ash">Nenhuma ação registrada ainda.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-white/5 overflow-y-auto">
              {logs.map((log) => (
                <li key={log.id} className="px-5 py-3 text-xs">
                  <p className="font-semibold text-fog">
                    {log.action} <span className="font-normal text-ash">· {log.actorName}</span>
                  </p>
                  <p className="mt-0.5 text-ash/70">
                    {log.targetType} · {log.targetId.slice(0, 10)}…
                    {log.notes ? ` · ${log.notes}` : ""}
                  </p>
                  <p className="mt-1 text-[0.6rem] uppercase tracking-wide text-ash/50">
                    {dateFormatter.format(new Date(log.createdAt))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
