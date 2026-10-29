"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, CalendarPlus, MessageSquare, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type NotificationRecord = {
  id: string;
  type: string;
  title: string;
  body: string;
  targetUrl: string;
  readAt: string | null;
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

function iconFor(type: string) {
  if (type === "NEW_EVENT") return CalendarPlus;
  if (type === "PRIVATE_MESSAGE") return MessageSquare;
  return UsersRound;
}

export function NotificationsInbox({ initialItems }: { initialItems: NotificationRecord[] }) {
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialItems.filter((item) => !item.readAt).length);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications?limit=50", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { items?: NotificationRecord[]; unread?: number };
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
    } catch {
      /* a central continua com os dados carregados no servidor */
    }
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/notifications/stream");
    source.addEventListener("notification", () => void reload());
    source.addEventListener("ready", () => void reload());
    return () => source.close();
  }, [reload]);

  async function markAllRead() {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        setItems((current) =>
          current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
        );
        setUnread(0);
      }
    } finally {
      setBusy(false);
    }
  }

  function markRead(id: string) {
    if (items.find((item) => item.id === id)?.readAt) return;
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)),
    );
    setUnread((current) => Math.max(0, current - 1));
    void fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
  }

  return (
    <section aria-labelledby="inbox-title" className="panel rounded-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/8 px-5 py-4">
        <div>
          <h2 id="inbox-title" className="text-lg font-bold text-fog">
            Suas notificações
          </h2>
          <p className="mt-0.5 text-xs text-ash">
            {unread > 0
              ? `${unread} ${unread === 1 ? "não lida" : "não lidas"} — clique para marcar como lida.`
              : "Tudo em dia. Novos eventos e mensagens aparecem aqui."}
          </p>
        </div>
        {unread > 0 ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => void markAllRead()} disabled={busy}>
            Marcar todas como lidas
          </Button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <BellRing className="size-8 text-brand-light" aria-hidden="true" />
          <p className="max-w-sm text-sm text-ash">
            Nenhuma notificação ainda. Quando um novo rolê for publicado ou alguém conversar com você,
            o aviso fica registrado aqui.
          </p>
        </div>
      ) : (
        <ul>
          {items.map((item) => {
            const Icon = iconFor(item.type);
            return (
              <li key={item.id} className="border-b border-white/5 last:border-0">
                <Link
                  href={item.targetUrl}
                  onClick={() => markRead(item.id)}
                  className={cn(
                    "flex gap-3 px-5 py-4 transition hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none",
                    !item.readAt && "bg-brand/[0.06]",
                  )}
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-brand/25 bg-brand/10 text-brand-light">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-fog">{item.title}</span>
                      {!item.readAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-brand-light/40 bg-brand/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-brand-light">
                          Nova
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-ash">{item.body}</span>
                    <span className="mt-1.5 block text-[0.62rem] uppercase tracking-wide text-ash/60">
                      {dateFormatter.format(new Date(item.createdAt))}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
