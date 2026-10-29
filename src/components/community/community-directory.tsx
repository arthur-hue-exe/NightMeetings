"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Search, UsersRound } from "lucide-react";
import { EventImage } from "@/components/events/event-image";
import { COMMUNITY_CATEGORIES, getCommunityCategory } from "@/lib/constants";

type CommunityItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  emblemUrl: string;
  city: string | null;
  category: string;
  createdAt: string;
  creatorName: string;
};

type Props = {
  initialItems: CommunityItem[];
  initialHasMore: boolean;
  initialTotal: number;
  initialNextOffset: number;
  filters: { q: string; category: string; city: string };
  cities: string[];
  canCreate: boolean;
  createHref: string;
};

export function CommunityDirectory({
  initialItems,
  initialHasMore,
  initialTotal,
  initialNextOffset,
  filters,
  cities,
  canCreate,
  createHref,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = Boolean(filters.q || filters.category || filters.city);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        offset: String(nextOffset),
        limit: "9",
      });
      if (filters.q) params.set("q", filters.q);
      if (filters.category) params.set("category", filters.category);
      if (filters.city) params.set("city", filters.city);

      const response = await fetch(`/api/communities?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as {
        ok?: boolean;
        items?: Array<CommunityItem & { creator?: { name: string }; createdAt?: string }>;
        hasMore?: boolean;
        nextOffset?: number;
        error?: string;
      };
      if (!response.ok || !data.ok) throw new Error(data.error || "Não foi possível carregar mais comunidades.");
      setItems((current) => {
        const known = new Set(current.map((item) => item.id));
        const mapped = (data.items ?? [])
          .filter((item) => !known.has(item.id))
          .map((item) => ({
            ...item,
            creatorName: item.creatorName ?? item.creator?.name ?? "Organizador",
            createdAt: item.createdAt ?? new Date().toISOString(),
          }));
        return [...current, ...mapped];
      });
      setHasMore(Boolean(data.hasMore));
      setNextOffset(data.nextOffset ?? nextOffset);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível carregar mais comunidades.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section aria-labelledby="grupos-title" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="grupos-title" className="text-lg font-bold text-fog">
            Grupos da comunidade
          </h2>
          <p className="mt-1 text-sm text-ash">
            {initialTotal} {initialTotal === 1 ? "grupo ativo" : "grupos ativos"} com convite oficial no WhatsApp.
          </p>
        </div>
        <Link
          href={canCreate ? createHref : "/entrar?next=/comunidade/criar"}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-light px-5 py-2.5 text-xs font-bold text-white transition hover:brightness-110"
        >
          <Plus className="size-4" aria-hidden="true" />
          {canCreate ? "Criar comunidade" : "Entrar para criar"}
        </Link>
      </div>

      <form
        method="get"
        action="/comunidade"
        className="panel grid gap-3 rounded-2xl p-4 sm:grid-cols-[1fr_14rem_12rem_auto]"
      >
        <input type="hidden" name="aba" value="grupos" />
        <label className="block text-[0.68rem] font-semibold uppercase tracking-wide text-ash">
          Buscar
          <span className="relative mt-1 block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ash/60" aria-hidden="true" />
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder="Nome, cidade ou descrição"
              className="w-full rounded-xl border border-white/12 bg-night-3/60 py-2 pl-8 pr-3 text-sm text-fog placeholder:text-ash/50 focus:border-brand-light/50 focus:outline-none"
            />
          </span>
        </label>

        <label className="block text-[0.68rem] font-semibold uppercase tracking-wide text-ash">
          Categoria
          <select
            name="category"
            defaultValue={filters.category}
            className="mt-1 w-full rounded-xl border border-white/12 bg-night-3/60 px-3 py-2 text-sm text-fog focus:border-brand-light/50 focus:outline-none"
          >
            <option value="">Todas</option>
            {COMMUNITY_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-[0.68rem] font-semibold uppercase tracking-wide text-ash">
          Cidade
          <select
            name="city"
            defaultValue={filters.city}
            className="mt-1 w-full rounded-xl border border-white/12 bg-night-3/60 px-3 py-2 text-sm text-fog focus:border-brand-light/50 focus:outline-none"
          >
            <option value="">Todas</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="h-10 rounded-full border border-white/12 bg-white/[0.045] px-4 text-xs font-semibold text-fog transition hover:border-brand-light/45"
          >
            Filtrar
          </button>
          {hasFilters ? (
            <Link
              href="/comunidade?aba=grupos"
              className="h-10 rounded-full px-3 pt-2.5 text-xs font-semibold text-ash transition hover:text-fog"
            >
              Limpar
            </Link>
          ) : null}
        </div>
      </form>

      {items.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 rounded-3xl px-6 py-14 text-center">
          <UsersRound className="size-9 text-brand-light" aria-hidden="true" />
          <h3 className="text-base font-bold text-fog">
            {hasFilters ? "Nenhum grupo com esses filtros" : "Ainda não há grupos publicados"}
          </h3>
          <p className="max-w-md text-sm text-ash">
            {hasFilters
              ? "Tente outra categoria, cidade ou termo de busca."
              : "Crie a primeira comunidade com emblema e convite oficial do WhatsApp."}
          </p>
          {hasFilters ? (
            <Link
              href="/comunidade?aba=grupos"
              className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-fog transition hover:border-brand-light/40"
            >
              Limpar filtros
            </Link>
          ) : (
            <Link
              href={canCreate ? createHref : "/entrar?next=/comunidade/criar"}
              className="rounded-full bg-gradient-to-r from-brand to-brand-light px-4 py-2 text-xs font-bold text-white"
            >
              Criar comunidade
            </Link>
          )}
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((community) => {
            const categoryLabel = getCommunityCategory(community.category)?.label ?? "Outros";
            return (
              <li key={community.id}>
                <Link
                  href={`/comunidade/${community.slug}`}
                  className="panel group flex h-full flex-col rounded-3xl p-5 transition hover:border-brand-light/40 hover:bg-white/[0.05]"
                >
                  <div className="flex items-start gap-3">
                    <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-white/12 bg-night-3">
                      <EventImage
                        src={community.emblemUrl}
                        alt={`Emblema de ${community.name}`}
                        fill
                        sizes="64px"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-fog">{community.name}</h3>
                      <p className="mt-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-brand-light">
                        {categoryLabel}
                      </p>
                      {community.city ? (
                        <p className="mt-0.5 text-[0.68rem] text-ash">{community.city}</p>
                      ) : null}
                    </div>
                  </div>

                  <p className="mt-4 line-clamp-3 flex-1 text-xs leading-relaxed text-ash">
                    {community.description || "Comunidade de motociclistas com convite oficial no WhatsApp."}
                  </p>

                  <span className="mt-4 flex items-center justify-between border-t border-white/8 pt-3 text-[0.66rem] text-ash/70">
                    <span className="truncate">por {community.creatorName}</span>
                    <span className="font-semibold text-brand-light transition group-hover:text-fog">
                      Ver detalhes →
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {error ? (
        <p role="alert" className="text-center text-xs text-red-300">
          {error}
        </p>
      ) : null}

      {hasMore ? (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-xs font-semibold text-fog transition hover:border-brand-light/40 disabled:opacity-60"
          >
            {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
            {loading ? "Carregando…" : "Carregar mais grupos"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
