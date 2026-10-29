"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  MessageSquarePlus,
  Send,
  Settings2,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { SquareImageUploader } from "@/components/community/square-image-uploader";
import { cn } from "@/lib/utils";

type ConversationSummary = {
  id: string;
  type: "DIRECT" | "GROUP";
  title: string;
  imageUrl: string | null;
  status: "ACTIVE" | "CLOSED";
  memberCount: number;
  unread: number;
  lastMessage: { content: string; createdAt: string; senderName: string } | null;
  updatedAt: string;
};

type Member = { id: string; name: string; role: string };
type ActiveConversation = {
  id: string;
  type: "DIRECT" | "GROUP";
  title: string;
  imageUrl: string | null;
  status: "ACTIVE" | "CLOSED";
  createdById: string;
  isManager: boolean;
  members: Member[];
};
type Message = {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  senderName: string;
  own: boolean;
};

const timeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Messenger({
  currentUserId,
  initialConversationId,
}: {
  currentUserId: string;
  initialConversationId?: string;
}) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [listLoaded, setListLoaded] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveConversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [composer, setComposer] = useState<null | "direct" | "group">(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "close" | "leave">(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const activeIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      if (!response.ok) return [];
      const data = (await response.json()) as { conversations?: ConversationSummary[] };
      const list = data.conversations ?? [];
      setConversations(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await loadConversations();
      if (cancelled) return;
      setListLoaded(true);
      const target =
        initialConversationId && list.some((item) => item.id === initialConversationId)
          ? initialConversationId
          : list[0]?.id ?? null;
      if (target) setActiveId(target);
    })();
    return () => {
      cancelled = true;
    };
  }, [initialConversationId, loadConversations]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    const source = new EventSource("/api/conversations/stream");
    source.addEventListener("message", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as {
          conversationId?: string;
          message?: Message;
        };
        if (!payload.conversationId || !payload.message) return;
        if (payload.conversationId === activeIdRef.current) {
          setMessages((current) =>
            current.some((item) => item.id === payload.message!.id)
              ? current
              : [...current, payload.message!],
          );
          if (!payload.message.own) {
            void fetch(`/api/conversations/${payload.conversationId}/read`, { method: "POST" });
          }
        }
        void loadConversations();
      } catch {
        /* ignora payload inválido */
      }
    });
    source.addEventListener("conversation", () => void loadConversations());
    return () => source.close();
  }, [loadConversations]);

  const refreshThread = useCallback(async (id: string) => {
    const response = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as {
      conversation?: ActiveConversation;
      messages?: { items?: Message[]; hasMore?: boolean; nextBefore?: string | null };
    };
    if (data.conversation) setActive(data.conversation);
    if (data.messages) {
      setMessages(data.messages.items ?? []);
      setHasMore(Boolean(data.messages.hasMore));
      setNextBefore(data.messages.nextBefore ?? null);
    }
  }, []);

  useEffect(() => {
    if (!activeId) {
      setActive(null);
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingThread(true);
    setManageOpen(false);
    setConfirmAction(null);
    setError(null);
    setNotice(null);
    void (async () => {
      try {
        const response = await fetch(`/api/conversations/${activeId}`, { cache: "no-store" });
        const data = (await response.json()) as {
          conversation?: ActiveConversation;
          messages?: { items?: Message[]; hasMore?: boolean; nextBefore?: string | null };
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok || !data.conversation) {
          throw new Error(data.error || "Não foi possível abrir a conversa.");
        }
        setActive(data.conversation);
        setMessages(data.messages?.items ?? []);
        setHasMore(Boolean(data.messages?.hasMore));
        setNextBefore(data.messages?.nextBefore ?? null);
        setConversations((current) =>
          current.map((item) => (item.id === activeId ? { ...item, unread: 0 } : item)),
        );
        void fetch(`/api/conversations/${activeId}/read`, { method: "POST" });
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Erro ao abrir a conversa.");
      } finally {
        if (!cancelled) setLoadingThread(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length, activeId]);

  async function loadOlder() {
    if (!activeId || !nextBefore || loadingMore) return;
    setLoadingMore(true);
    try {
      const response = await fetch(
        `/api/conversations/${activeId}/messages?before=${encodeURIComponent(nextBefore)}`,
        { cache: "no-store" },
      );
      const data = (await response.json()) as {
        items?: Message[];
        hasMore?: boolean;
        nextBefore?: string | null;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Não foi possível carregar mensagens.");
      setMessages((current) => {
        const known = new Set(current.map((item) => item.id));
        return [...(data.items ?? []).filter((item) => !known.has(item.id)), ...current];
      });
      setHasMore(Boolean(data.hasMore));
      setNextBefore(data.nextBefore ?? null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar mensagens.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    if (!activeId || !active || sending || content.trim().length === 0) return;
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/conversations/${activeId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: Message; error?: string };
      if (!response.ok || !data.ok || !data.message) {
        throw new Error(data.error || "Não foi possível enviar a mensagem.");
      }
      setMessages((current) =>
        current.some((item) => item.id === data.message!.id) ? current : [...current, data.message!],
      );
      setContent("");
      setConversations((current) =>
        current
          .map((item) =>
            item.id === activeId
              ? {
                  ...item,
                  lastMessage: {
                    content: data.message!.content,
                    createdAt: data.message!.createdAt,
                    senderName: data.message!.senderName,
                  },
                  updatedAt: data.message!.createdAt,
                  unread: 0,
                }
              : item,
          )
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível enviar a mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function createDirect(userId: string) {
    setBusyAction("direct");
    setError(null);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "DIRECT", userId }),
      });
      const data = (await response.json()) as { ok?: boolean; conversationId?: string; error?: string };
      if (!response.ok || !data.ok || !data.conversationId) {
        throw new Error(data.error || "Não foi possível iniciar a conversa.");
      }
      setComposer(null);
      await loadConversations();
      setActiveId(data.conversationId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível iniciar a conversa.");
    } finally {
      setBusyAction(null);
    }
  }

  async function leaveConversation() {
    if (!activeId) return;
    setBusyAction("leave");
    setError(null);
    try {
      const response = await fetch(`/api/conversations/${activeId}/leave`, { method: "POST" });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível sair da conversa.");
      setConfirmAction(null);
      setActiveId(null);
      setActive(null);
      await loadConversations();
      setNotice("Você saiu da conversa.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível sair da conversa.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section aria-labelledby="mensagens-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="mensagens-title" className="text-lg font-bold text-fog">
            Mensagens privadas
          </h2>
          <p className="text-sm text-ash">
            Conversas diretas e grupos fechados. Visitantes não têm acesso; cada ação verifica a participação.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setComposer((current) => (current === "direct" ? null : "direct"))}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-fog transition hover:border-brand-light/40"
          >
            <MessageSquarePlus className="size-3.5" aria-hidden="true" /> Nova conversa
          </button>
          <button
            type="button"
            onClick={() => setComposer((current) => (current === "group" ? null : "group"))}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand to-brand-light px-3.5 py-2 text-xs font-bold text-white transition hover:brightness-110"
          >
            <UsersRound className="size-3.5" aria-hidden="true" /> Novo grupo
          </button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-1.5 rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" /> {error}
        </p>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          {notice}
        </p>
      ) : null}

      {composer === "direct" ? (
        <div className="panel rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-fog">Buscar pessoa para conversar</p>
            <button type="button" onClick={() => setComposer(null)} aria-label="Fechar busca">
              <X className="size-4 text-ash" aria-hidden="true" />
            </button>
          </div>
          <UserSearch
            excludeIds={[]}
            placeholder="Digite o nome de um membro"
            onSelect={(user) => void createDirect(user.id)}
            disabled={busyAction === "direct"}
          />
        </div>
      ) : null}

      {composer === "group" ? (
        <GroupComposer
          onCancel={() => setComposer(null)}
          onCreated={async (id) => {
            setComposer(null);
            await loadConversations();
            setActiveId(id);
          }}
        />
      ) : null}

      <div className="panel grid overflow-hidden rounded-3xl lg:grid-cols-[20rem_1fr]">
        <div className="border-b border-white/8 lg:border-b-0 lg:border-r">
          <div className="border-b border-white/8 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-ash">Conversas</p>
          </div>
          <div className="max-h-72 overflow-y-auto lg:max-h-[34rem]">
            {!listLoaded ? (
              <p className="px-4 py-6 text-xs text-ash">Carregando conversas…</p>
            ) : conversations.length === 0 ? (
              <p className="px-4 py-6 text-xs leading-relaxed text-ash">
                Nenhuma conversa ainda. Comece uma conversa direta ou crie um grupo privado.
              </p>
            ) : (
              <ul>
                {conversations.map((conversation) => (
                  <li key={conversation.id} className="border-b border-white/5 last:border-0">
                    <button
                      type="button"
                      onClick={() => setActiveId(conversation.id)}
                      aria-current={conversation.id === activeId ? "true" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]",
                        conversation.id === activeId && "bg-brand/[0.08]",
                      )}
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/12 bg-night-3 text-[0.66rem] font-bold text-brand-light">
                        {initials(conversation.title)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-xs font-bold text-fog">{conversation.title}</span>
                          {conversation.type === "GROUP" ? (
                            <UsersRound className="size-3 shrink-0 text-ash/60" aria-label="Grupo" />
                          ) : null}
                          {conversation.status === "CLOSED" ? (
                            <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[0.55rem] uppercase text-ash">
                              Encerrado
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate text-[0.68rem] text-ash">
                          {conversation.lastMessage
                            ? `${conversation.lastMessage.senderName}: ${conversation.lastMessage.content}`
                            : "Sem mensagens ainda"}
                        </span>
                      </span>
                      {conversation.unread > 0 ? (
                        <span className="flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-[0.6rem] font-extrabold text-white">
                          {conversation.unread > 9 ? "9+" : conversation.unread}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex min-h-[26rem] flex-col">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-12 text-center">
              <MessageSquarePlus className="size-8 text-brand-light" aria-hidden="true" />
              <p className="text-sm font-semibold text-fog">Selecione uma conversa</p>
              <p className="max-w-sm text-xs text-ash">
                Escolha uma conversa na lista ou crie uma nova. O conteúdo é privado entre os participantes.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveId(null)}
                    className="rounded-full border border-white/10 p-1.5 text-ash transition hover:text-fog lg:hidden"
                    aria-label="Voltar para a lista de conversas"
                  >
                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                  </button>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-fog">{active.title}</p>
                    <p className="text-[0.66rem] text-ash">
                      {active.type === "GROUP"
                        ? `${active.members.length} participante${active.members.length === 1 ? "" : "s"}`
                        : "Conversa direta"}
                      {active.status === "CLOSED" ? " · encerrada" : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {active.type === "GROUP" ? (
                    <button
                      type="button"
                      onClick={() => setManageOpen((value) => !value)}
                      aria-expanded={manageOpen}
                      className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-[0.68rem] font-semibold text-ash transition hover:text-fog"
                    >
                      <Settings2 className="size-3.5" aria-hidden="true" /> Gerenciar
                    </button>
                  ) : null}
                  {confirmAction === "leave" ? (
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void leaveConversation()}
                        className="rounded-full bg-red-500/20 px-2.5 py-1 text-[0.66rem] font-bold text-red-200"
                      >
                        {busyAction === "leave" ? "Saindo…" : "Confirmar saída"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction(null)}
                        className="text-[0.66rem] text-ash"
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmAction("leave")}
                      className="text-[0.66rem] font-semibold text-ash/70 transition hover:text-red-300"
                    >
                      Sair
                    </button>
                  )}
                </div>
              </div>

              {manageOpen && active.type === "GROUP" ? (
                <GroupManager
                  conversation={active}
                  currentUserId={currentUserId}
                  busyAction={busyAction}
                  confirmAction={confirmAction}
                  setConfirmAction={setConfirmAction}
                  onNotice={setNotice}
                  onError={setError}
                  onRefresh={async () => {
                    await refreshThread(active.id);
                    await loadConversations();
                  }}
                  setBusyAction={setBusyAction}
                />
              ) : null}

              <div
                ref={scrollRef}
                role="log"
                aria-live="polite"
                aria-label="Mensagens da conversa"
                className="flex-1 overflow-y-auto px-4 py-4"
                style={{ maxHeight: "22rem" }}
              >
                {loadingThread ? (
                  <div className="flex h-40 items-center justify-center text-ash">
                    <Loader2 className="size-5 animate-spin" aria-label="Carregando mensagens" />
                  </div>
                ) : (
                  <>
                    {hasMore ? (
                      <div className="mb-3 flex justify-center">
                        <button
                          type="button"
                          onClick={() => void loadOlder()}
                          disabled={loadingMore}
                          className="rounded-full border border-white/12 px-3 py-1.5 text-[0.66rem] font-semibold text-ash transition hover:text-fog disabled:opacity-60"
                        >
                          {loadingMore ? "Carregando…" : "Carregar mensagens anteriores"}
                        </button>
                      </div>
                    ) : null}

                    {messages.length === 0 ? (
                      <p className="py-10 text-center text-xs text-ash">
                        Nenhuma mensagem ainda. Diga um oi para começar.
                      </p>
                    ) : (
                      <ul className="space-y-2.5">
                        {messages.map((message) => (
                          <li
                            key={message.id}
                            className={cn("flex", message.own ? "justify-end" : "justify-start")}
                          >
                            <div
                              className={cn(
                                "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[70%]",
                                message.own
                                  ? "rounded-br-md bg-gradient-to-br from-brand to-brand-light text-white"
                                  : "rounded-bl-md border border-white/8 bg-white/[0.04] text-fog",
                              )}
                            >
                              {!message.own ? (
                                <p className="text-[0.62rem] font-bold text-brand-light">
                                  {message.senderName}
                                </p>
                              ) : null}
                              <p className="whitespace-pre-wrap break-words leading-relaxed">
                                {message.content}
                              </p>
                              <p
                                className={cn(
                                  "mt-1 text-right text-[0.58rem]",
                                  message.own ? "text-white/70" : "text-ash/60",
                                )}
                              >
                                {timeFormatter.format(new Date(message.createdAt))}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>

              {active.status === "CLOSED" ? (
                <p className="border-t border-white/8 px-4 py-4 text-center text-xs text-ash">
                  Este grupo foi encerrado. O histórico permanece disponível para consulta.
                </p>
              ) : (
                <form onSubmit={(event) => void sendMessage(event)} className="border-t border-white/8 px-4 py-3">
                  <label htmlFor="private-message" className="sr-only">
                    Escreva uma mensagem privada
                  </label>
                  <div className="flex items-end gap-2">
                    <textarea
                      id="private-message"
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      maxLength={2000}
                      rows={2}
                      placeholder="Escreva uma mensagem…"
                      className="min-h-10 flex-1 resize-y rounded-2xl border border-white/12 bg-night-3/60 px-3.5 py-2.5 text-sm text-fog placeholder:text-ash/50 focus:border-brand-light/50 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sending || content.trim().length === 0}
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-brand to-brand-light text-white transition hover:brightness-110 disabled:opacity-50"
                      aria-label="Enviar mensagem"
                    >
                      {sending ? (
                        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Send className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>

      <p className="text-[0.66rem] leading-relaxed text-ash/60">
        As mensagens privadas são visíveis apenas para os participantes da conversa. O MotorMeetings não
        promete criptografia ponta a ponta; o conteúdo é armazenado no servidor para entregar o histórico.
      </p>
    </section>
  );
}

function GroupComposer({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [selected, setSelected] = useState<Array<{ id: string; name: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) {
      setError("Dê um nome ao grupo.");
      return;
    }
    if (selected.length === 0) {
      setError("Convide pelo menos um participante.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "GROUP",
          name,
          memberIds: selected.map((member) => member.id),
          imageUrl,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; conversationId?: string; error?: string };
      if (!response.ok || !data.ok || !data.conversationId) {
        throw new Error(data.error || "Não foi possível criar o grupo.");
      }
      onCreated(data.conversationId);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível criar o grupo.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="panel space-y-3 rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-fog">Criar grupo privado</p>
        <button type="button" onClick={onCancel} aria-label="Fechar criação de grupo">
          <X className="size-4 text-ash" aria-hidden="true" />
        </button>
      </div>

      <label className="block text-[0.68rem] font-semibold text-ash">
        Nome do grupo
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={60}
          className="mt-1 w-full rounded-xl border border-white/12 bg-night-3/60 px-3 py-2 text-sm text-fog focus:border-brand-light/50 focus:outline-none"
          placeholder="Ex.: Rolê de sábado"
        />
      </label>

      <div>
        <p className="text-[0.68rem] font-semibold text-ash">Participantes</p>
        {selected.length > 0 ? (
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {selected.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => setSelected((current) => current.filter((item) => item.id !== member.id))}
                  className="inline-flex items-center gap-1 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-[0.66rem] font-semibold text-brand-light"
                >
                  {member.name} <X className="size-3" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <UserSearch
          excludeIds={selected.map((member) => member.id)}
          placeholder="Buscar membros por nome"
          onSelect={(user) => setSelected((current) => [...current, user])}
          disabled={busy}
        />
      </div>

      <div>
        <p className="mb-1 text-[0.68rem] font-semibold text-ash">Imagem do grupo (opcional)</p>
        <SquareImageUploader
          value={imageUrl}
          onChange={setImageUrl}
          onBusyChange={setUploading}
          label="imagem do grupo"
          hint="Aparece no cabeçalho da conversa."
        />
      </div>

      {error ? (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={busy || uploading}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-light px-5 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <Check className="size-3.5" aria-hidden="true" />}
          {busy ? "Criando…" : "Criar grupo"}
        </button>
      </div>
    </form>
  );
}

function GroupManager({
  conversation,
  currentUserId,
  busyAction,
  confirmAction,
  setConfirmAction,
  onNotice,
  onError,
  onRefresh,
  setBusyAction,
}: {
  conversation: ActiveConversation;
  currentUserId: string;
  busyAction: string | null;
  confirmAction: null | "close" | "leave";
  setConfirmAction: (value: null | "close" | "leave") => void;
  onNotice: (value: string | null) => void;
  onError: (value: string | null) => void;
  onRefresh: () => Promise<void>;
  setBusyAction: (value: string | null) => void;
}) {
  const [name, setName] = useState(conversation.title);
  const [imageUrl, setImageUrl] = useState(conversation.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setName(conversation.title);
    setImageUrl(conversation.imageUrl ?? "");
  }, [conversation.title, conversation.imageUrl]);

  async function save() {
    setBusyAction("save");
    onError(null);
    onNotice(null);
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, imageUrl }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível salvar o grupo.");
      await onRefresh();
      onNotice("Grupo atualizado.");
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Não foi possível salvar o grupo.");
    } finally {
      setBusyAction(null);
    }
  }

  async function addMember(userId: string) {
    setBusyAction("add");
    onError(null);
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userId] }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível adicionar a pessoa.");
      await onRefresh();
      onNotice("Participante adicionado.");
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Não foi possível adicionar a pessoa.");
    } finally {
      setBusyAction(null);
    }
  }

  async function removeMember(userId: string) {
    setBusyAction(`remove:${userId}`);
    onError(null);
    try {
      const response = await fetch(`/api/conversations/${conversation.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userId] }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível remover a pessoa.");
      await onRefresh();
      onNotice("Participante removido.");
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Não foi possível remover a pessoa.");
    } finally {
      setBusyAction(null);
    }
  }

  async function closeGroup() {
    setBusyAction("close");
    onError(null);
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível encerrar o grupo.");
      setConfirmAction(null);
      await onRefresh();
      onNotice("Grupo encerrado. O histórico continua visível.");
    } catch (reason) {
      onError(reason instanceof Error ? reason.message : "Não foi possível encerrar o grupo.");
    } finally {
      setBusyAction(null);
    }
  }

  if (!conversation.isManager) {
    return (
      <div className="border-b border-white/8 bg-white/[0.02] px-4 py-3">
        <p className="text-[0.68rem] text-ash">
          Membros: {conversation.members.map((member) => member.name).join(", ")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 border-b border-white/8 bg-white/[0.02] px-4 py-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[0.68rem] font-semibold text-ash">
          Nome do grupo
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            className="mt-1 w-full rounded-xl border border-white/12 bg-night px-3 py-2 text-sm text-fog focus:border-brand-light/50 focus:outline-none"
          />
        </label>
        <div>
          <p className="mb-1 text-[0.68rem] font-semibold text-ash">Imagem do grupo</p>
          <SquareImageUploader
            value={imageUrl}
            onChange={setImageUrl}
            onBusyChange={setUploading}
            label="imagem do grupo"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busyAction !== null || uploading}
          className="rounded-full bg-brand px-3.5 py-1.5 text-[0.68rem] font-bold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {busyAction === "save" ? "Salvando…" : "Salvar alterações"}
        </button>
        {conversation.status === "ACTIVE" ? (
          confirmAction === "close" ? (
            <span className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => void closeGroup()}
                disabled={busyAction !== null}
                className="rounded-full bg-red-500/20 px-3 py-1.5 text-[0.66rem] font-bold text-red-200 disabled:opacity-60"
              >
                {busyAction === "close" ? "Encerrando…" : "Confirmar encerramento"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="text-[0.66rem] font-semibold text-ash"
              >
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmAction("close")}
              className="rounded-full border border-red-400/30 px-3.5 py-1.5 text-[0.68rem] font-semibold text-red-300 transition hover:bg-red-500/10"
            >
              Encerrar grupo
            </button>
          )
        ) : null}
      </div>

      <div>
        <p className="text-[0.68rem] font-semibold text-ash">
          Participantes ({conversation.members.length})
        </p>
        <ul className="mt-1.5 space-y-1.5">
          {conversation.members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-white/8 bg-night-3/40 px-3 py-1.5"
            >
              <span className="truncate text-xs text-fog">
                {member.name}
                {member.id === currentUserId ? " (você)" : ""}
                {member.role === "ADMIN" ? (
                  <span className="ml-2 rounded-full bg-brand/15 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase text-brand-light">
                    admin
                  </span>
                ) : null}
              </span>
              {member.id !== currentUserId ? (
                <button
                  type="button"
                  onClick={() => void removeMember(member.id)}
                  disabled={busyAction !== null}
                  className="text-[0.62rem] font-semibold text-ash/70 transition hover:text-red-300 disabled:opacity-50"
                >
                  {busyAction === `remove:${member.id}` ? "Removendo…" : "Remover"}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="mt-2">
          <UserSearch
            excludeIds={conversation.members.map((member) => member.id)}
            placeholder="Adicionar pessoa ao grupo"
            onSelect={(user) => void addMember(user.id)}
            disabled={busyAction !== null}
          />
        </div>
      </div>
    </div>
  );
}

function UserSearch({
  excludeIds,
  placeholder,
  onSelect,
  disabled,
}: {
  excludeIds: string[];
  placeholder: string;
  onSelect: (user: { id: string; name: string }) => void;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; name: string }>>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      setSearching(true);
      void (async () => {
        try {
          const response = await fetch(`/api/users/search?q=${encodeURIComponent(term)}`, {
            cache: "no-store",
          });
          if (!response.ok) return;
          const data = (await response.json()) as { users?: Array<{ id: string; name: string }> };
          setResults((data.users ?? []).filter((user) => !excludeIds.includes(user.id)));
        } catch {
          /* silencioso */
        } finally {
          setSearching(false);
        }
      })();
    }, 280);
    return () => clearTimeout(timer);
  }, [query, excludeIds]);

  return (
    <div className="mt-1.5">
      <div className="relative">
        <UserPlus className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ash/60" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full rounded-xl border border-white/12 bg-night-3/60 py-2 pl-8 pr-3 text-xs text-fog placeholder:text-ash/50 focus:border-brand-light/50 focus:outline-none disabled:opacity-60"
          aria-label={placeholder}
        />
      </div>
      {searching ? <p className="mt-1 text-[0.64rem] text-ash">Buscando…</p> : null}
      {results.length > 0 ? (
        <ul className="mt-1.5 max-h-40 overflow-y-auto rounded-xl border border-white/8 bg-night">
          {results.map((user) => (
            <li key={user.id} className="border-b border-white/5 last:border-0">
              <button
                type="button"
                onClick={() => {
                  onSelect(user);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-fog transition hover:bg-white/[0.05]"
              >
                <span className="flex size-6 items-center justify-center rounded-full bg-brand/15 text-[0.55rem] font-bold text-brand-light">
                  {initials(user.name)}
                </span>
                <span className="truncate">{user.name}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {query.trim().length >= 2 && !searching && results.length === 0 ? (
        <p className="mt-1 text-[0.64rem] text-ash/60">Nenhuma pessoa encontrada.</p>
      ) : null}
    </div>
  );
}
