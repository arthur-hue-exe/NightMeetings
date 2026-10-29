"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Flag, Loader2, MessageCircle, Send } from "lucide-react";
import { FORUM_MESSAGE_MAX } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  displayName: string;
  content: string;
  createdAt: string;
  authenticated: boolean;
};

type Props = {
  initialItems: Message[];
  initialHasMore: boolean;
  initialNextBefore: string | null;
  authenticated: boolean;
  currentName: string | null;
  nickname: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const REASONS = [
  { value: "SPAM", label: "Spam ou divulgação repetida" },
  { value: "ABUSO", label: "Abuso ou ofensa" },
  { value: "CONTEUDO_INADEQUADO", label: "Conteúdo inadequado" },
  { value: "GOLPE", label: "Golpe ou fraude" },
  { value: "OUTRO", label: "Outro motivo" },
];

export function Forum({
  initialItems,
  initialHasMore,
  initialNextBefore,
  authenticated,
  currentName,
  nickname,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextBefore, setNextBefore] = useState<string | null>(initialNextBefore);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("SPAM");
  const [reportDetails, setReportDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportDone, setReportDone] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function appendMessage(message: Message) {
    setMessages((current) => {
      if (current.some((item) => item.id === message.id)) return current;
      return [...current, message].slice(-300);
    });
  }

  useEffect(() => {
    const source = new EventSource("/api/forum/stream");
    source.addEventListener("message", (event) => {
      try {
        appendMessage(JSON.parse((event as MessageEvent).data) as Message);
      } catch {
        /* payload inválido é ignorado */
      }
    });
    source.addEventListener("removed", (event) => {
      try {
        const { id } = JSON.parse((event as MessageEvent).data) as { id?: string };
        if (id) setMessages((current) => current.filter((item) => item.id !== id));
      } catch {
        /* ignora */
      }
    });
    source.addEventListener("refresh", () => void loadLatest());
    return () => source.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages.length]);

  async function loadLatest() {
    try {
      const response = await fetch("/api/forum/messages", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as {
        items?: Message[];
        hasMore?: boolean;
        nextBefore?: string | null;
      };
      setMessages(data.items ?? []);
      setHasMore(Boolean(data.hasMore));
      setNextBefore(data.nextBefore ?? null);
    } catch {
      /* silencioso */
    }
  }

  async function loadMore() {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/forum/messages?before=${encodeURIComponent(nextBefore)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        items?: Message[];
        hasMore?: boolean;
        nextBefore?: string | null;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar as mensagens.");
      setMessages((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...(data.items ?? []).filter((item) => !known.has(item.id)), ...current];
      });
      setHasMore(Boolean(data.hasMore));
      setNextBefore(data.nextBefore ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar as mensagens.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (sending) return;
    setError(null);
    setNotice(null);
    setSending(true);
    try {
      const response = await fetch("/api/forum/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: Message; error?: string };
      if (!response.ok || !data.ok || !data.message) {
        throw new Error(data.error || "Não foi possível publicar sua mensagem.");
      }
      appendMessage(data.message);
      setContent("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível publicar sua mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function sendReport(event: React.FormEvent, targetId: string) {
    event.preventDefault();
    setReportBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/forum/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "GLOBAL_MESSAGE",
          targetId,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; duplicate?: boolean };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Não foi possível registrar a denúncia.");
      }
      setReportDone(targetId);
      setReporting(null);
      setReportDetails("");
      setNotice(
        data.duplicate
          ? "Você já denunciou esta mensagem. A moderação vai revisar."
          : "Denúncia registrada. Obrigado por ajudar a manter o fórum saudável.",
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível registrar a denúncia.");
    } finally {
      setReportBusy(false);
    }
  }

  const remaining = FORUM_MESSAGE_MAX - content.length;

  return (
    <section aria-labelledby="forum-title" className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="panel overflow-hidden rounded-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
          <div>
            <h2 id="forum-title" className="text-base font-bold text-fog">
              Fórum global
            </h2>
            <p className="text-xs text-ash">Conversa aberta a visitantes e membros, em tempo real.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-[0.66rem] font-semibold text-emerald-300">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
            Ao vivo
          </span>
        </div>

        <div
          ref={listRef}
          className="max-h-[28rem] min-h-[18rem] overflow-y-auto px-4 py-4 sm:px-5"
          aria-live="polite"
          aria-relevant="additions removals"
        >
          {hasMore ? (
            <div className="mb-4 flex justify-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="rounded-full border border-white/12 bg-white/[0.03] px-4 py-1.5 text-xs font-semibold text-ash transition hover:border-brand-light/40 hover:text-fog disabled:opacity-60"
              >
                {loadingMore ? "Carregando…" : "Carregar mensagens anteriores"}
              </button>
            </div>
          ) : null}

          {messages.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 text-center">
              <MessageCircle className="size-8 text-brand-light" aria-hidden="true" />
              <p className="text-sm font-semibold text-fog">O fórum está esperando a primeira mensagem</p>
              <p className="max-w-sm text-xs text-ash">
                Fale sobre rotas, encontros, dicas de manutenção ou apenas mande um salve para a galera.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className="rounded-2xl border border-white/8 bg-white/[0.025] px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-fog">{message.displayName}</span>
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wide",
                        message.authenticated
                          ? "border-brand/30 bg-brand/10 text-brand-light"
                          : "border-white/10 bg-white/[0.04] text-ash",
                      )}
                    >
                      {message.authenticated ? "Membro" : "Visitante"}
                    </span>
                    <time
                      dateTime={message.createdAt}
                      className="text-[0.64rem] text-ash/60"
                    >
                      {dateFormatter.format(new Date(message.createdAt))}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-fog/90">
                    {message.content}
                  </p>

                  {reportDone === message.id ? (
                    <p className="mt-2 text-[0.66rem] text-emerald-300">Denúncia registrada.</p>
                  ) : reporting === message.id ? (
                    <form
                      onSubmit={(event) => void sendReport(event, message.id)}
                      className="mt-3 space-y-2 rounded-xl border border-white/10 bg-night-3/60 p-3"
                    >
                      <label className="block text-[0.68rem] font-semibold text-ash">
                        Motivo da denúncia
                        <select
                          value={reportReason}
                          onChange={(event) => setReportReason(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-white/12 bg-night px-2 py-1.5 text-xs text-fog"
                        >
                          {REASONS.map((reason) => (
                            <option key={reason.value} value={reason.value}>
                              {reason.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block text-[0.68rem] font-semibold text-ash">
                        Detalhes (opcional)
                        <textarea
                          value={reportDetails}
                          onChange={(event) => setReportDetails(event.target.value)}
                          maxLength={300}
                          rows={2}
                          className="mt-1 w-full resize-none rounded-lg border border-white/12 bg-night px-2 py-1.5 text-xs text-fog"
                        />
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={reportBusy}
                          className="rounded-full bg-brand px-3 py-1.5 text-[0.68rem] font-bold text-white disabled:opacity-60"
                        >
                          {reportBusy ? "Enviando…" : "Enviar denúncia"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setReporting(null)}
                          className="text-[0.68rem] font-semibold text-ash hover:text-fog"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setReporting(message.id);
                        setReportDetails("");
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-[0.64rem] font-semibold text-ash/70 transition hover:text-red-300"
                    >
                      <Flag className="size-3" aria-hidden="true" /> Denunciar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={(event) => void submit(event)} className="border-t border-white/8 px-4 py-4 sm:px-5">
          <label htmlFor="forum-message" className="sr-only">
            Escreva uma mensagem para o fórum global
          </label>
          <textarea
            id="forum-message"
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={FORUM_MESSAGE_MAX}
            rows={3}
            placeholder="Escreva sua mensagem para a galera…"
            className="w-full resize-y rounded-2xl border border-white/12 bg-night-3/60 px-4 py-3 text-sm text-fog placeholder:text-ash/50 focus:border-brand-light/50 focus:outline-none"
            aria-describedby="forum-help"
          />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <p id="forum-help" className="max-w-md text-[0.66rem] leading-relaxed text-ash/70">
              {authenticated
                ? `Publicando como ${currentName ?? "membro"}.`
                : nickname
                  ? `Publicando como ${nickname} neste navegador.`
                  : "Seu apelido será gerado automaticamente (ex.: User 4821) e vinculado a este navegador."}{" "}
              Sem anexos, sem HTML. Máximo de {FORUM_MESSAGE_MAX} caracteres.
            </p>
            <span
              className={cn(
                "text-[0.66rem] font-semibold",
                remaining < 80 ? "text-amber-300" : "text-ash/60",
              )}
              aria-live="polite"
            >
              {remaining} restantes
            </span>
          </div>

          {error ? (
            <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-red-300">
              <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" /> {error}
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="mt-2 text-xs text-emerald-300">
              {notice}
            </p>
          ) : null}

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={sending || content.trim().length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-light px-5 py-2.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-50"
            >
              {sending ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Send className="size-3.5" aria-hidden="true" />}
              {sending ? "Enviando…" : "Publicar mensagem"}
            </button>
          </div>
        </form>
      </div>

      <aside className="space-y-4">
        <div className="panel rounded-3xl p-5">
          <h3 className="text-sm font-bold text-fog">Regras rápidas</h3>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ash">
            <li>Respeite as pessoas: ofensas e preconceito não passam pela moderação.</li>
            <li>Nada de golpes, links suspeitos ou divulgação repetida.</li>
            <li>Não publique dados pessoais de terceiros.</li>
            <li>Denúncias são revisadas pela moderação. Mensagens podem ser ocultadas.</li>
            <li>Abuso pode suspender temporariamente a sessão de visitante.</li>
          </ul>
        </div>
        <div className="rounded-3xl border border-white/8 bg-white/[0.02] p-5">
          <h3 className="text-sm font-bold text-fog">Como funciona</h3>
          <p className="mt-2 text-xs leading-relaxed text-ash">
            O fórum é global e em tempo real. Visitantes recebem um apelido estável por navegador,
            sem uso de e-mail ou IP no apelido. Membros aparecem com o nome público da conta.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-ash/70">
            Histórico com paginação e retenção de 90 dias para mensagens visíveis.
          </p>
        </div>
      </aside>
    </section>
  );
}
