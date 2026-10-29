"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, CalendarPlus, MessageSquare, UsersRound } from "lucide-react";
import { cn } from "@/lib/utils";

type NotificationItem = {
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
  hour: "2-digit",
  minute: "2-digit",
});

function iconFor(type: string) {
  if (type === "NEW_EVENT") return CalendarPlus;
  if (type === "PRIVATE_MESSAGE") return MessageSquare;
  return UsersRound;
}

export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { items?: NotificationItem[]; unread?: number };
      setItems(data.items ?? []);
      setUnread(data.unread ?? 0);
      setLoaded(true);
    } catch {
      /* silencioso: o sino continua tentando no próximo evento */
    }
  }, []);

  useEffect(() => {
    void load();
    const source = new EventSource("/api/notifications/stream");
    source.addEventListener("notification", () => void load());
    source.addEventListener("ready", () => void load());
    return () => source.close();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function markAllRead() {
    const response = await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (response.ok) {
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
      setUnread(0);
    }
  }

  function markRead(id: string) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item)),
    );
    setUnread((current) => Math.max(0, current - 1));
    void fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={unread > 0 ? `Notificações, ${unread} não lidas` : "Notificações"}
        className={cn(
          "relative flex items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-fog transition hover:border-brand-light/45 hover:bg-white/[0.07]",
          compact ? "size-9" : "size-10",
        )}
      >
        {unread > 0 ? (
          <BellRing className="size-4.5 text-brand-light" aria-hidden="true" />
        ) : (
          <Bell className="size-4.5" aria-hidden="true" />
        )}
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-brand px-1.5 py-0.5 text-[0.62rem] font-extrabold leading-none text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Notificações"
          className="panel absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl shadow-2xl"
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/8 px-4 py-3">
            <p className="text-sm font-bold text-fog">Notificações</p>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-[0.7rem] font-semibold text-brand-light transition hover:text-fog"
              >
                Marcar todas como lidas
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!loaded ? (
              <p className="px-4 py-6 text-xs text-ash">Carregando…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-xs text-ash">
                Nenhuma notificação por aqui ainda. Publique um evento ou participe da comunidade.
              </p>
            ) : (
              <ul>
                {items.map((item) => {
                  const Icon = iconFor(item.type);
                  return (
                    <li key={item.id} className="border-b border-white/5 last:border-0">
                      <Link
                        role="menuitem"
                        href={item.targetUrl}
                        onClick={() => {
                          markRead(item.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex gap-3 px-4 py-3 transition hover:bg-white/[0.04]",
                          !item.readAt && "bg-brand/[0.06]",
                        )}
                      >
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-brand/25 bg-brand/10 text-brand-light">
                          <Icon className="size-3.5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-xs font-bold text-fog">{item.title}</span>
                            {!item.readAt ? (
                              <span className="size-1.5 shrink-0 rounded-full bg-brand-light" aria-label="Não lida" />
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-[0.7rem] leading-snug text-ash">{item.body}</span>
                          <span className="mt-1 block text-[0.62rem] uppercase tracking-wide text-ash/60">
                            {dateFormatter.format(new Date(item.createdAt))}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <Link
            href="/comunidade/notificacoes"
            onClick={() => setOpen(false)}
            className="block border-t border-white/8 px-4 py-3 text-center text-[0.7rem] font-semibold text-brand-light transition hover:bg-white/[0.04]"
          >
            Central de notificações
          </Link>
        </div>
      ) : null}
    </div>
  );
}
