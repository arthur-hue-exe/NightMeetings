"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { Input, Select } from "@/components/ui/form";
import { CategoryIcon } from "@/components/events/category-icon";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type FilterCity = { value: string; count: number };

const PERIODS = [
  { value: "any", label: "Qualquer período" },
  { value: "today", label: "Hoje" },
  { value: "weekend", label: "Este fim de semana" },
  { value: "month", label: "Este mês" },
];

export function EventFilters({
  cities,
  activeFiltersCount,
}: {
  cities: FilterCity[];
  activeFiltersCount: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [showFilters, setShowFilters] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const city = searchParams.get("city") ?? "";
  const category = searchParams.get("category") ?? "";
  const period = searchParams.get("period") ?? "any";
  const date = searchParams.get("date") ?? "";
  const sort = searchParams.get("sort") ?? "upcoming";
  const withRoute = searchParams.get("withRoute") === "1";

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, []);

  function update(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (!value) params.delete(key);
      else params.set(key, value);
      if (key !== "page") params.delete("page");
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    });
  }

  function onSearchChange(value: string) {
    setSearch(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      update({ q: value.trim() || null });
    }, 420);
  }

  function clearAll() {
    setSearch("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
  if (searchParams.get("q")) {
    chips.push({
      key: "q",
      label: `“${searchParams.get("q")}”`,
      onRemove: () => update({ q: null }),
    });
  }
  if (city) chips.push({ key: "city", label: city, onRemove: () => update({ city: null }) });
  if (category) {
    chips.push({
      key: "category",
      label: EVENT_CATEGORIES.find((item) => item.value === category)?.label ?? category,
      onRemove: () => update({ category: null }),
    });
  }
  if (period !== "any") {
    chips.push({
      key: "period",
      label: PERIODS.find((item) => item.value === period)?.label ?? period,
      onRemove: () => update({ period: null }),
    });
  }
  if (date) {
    chips.push({
      key: "date",
      label: `Data: ${date.split("-").reverse().join("/")}`,
      onRemove: () => update({ date: null }),
    });
  }
  if (withRoute) {
    chips.push({ key: "route", label: "Com rota", onRemove: () => update({ withRoute: null }) });
  }
  if (sort === "recent") {
    chips.push({ key: "sort", label: "Recém-publicados", onRemove: () => update({ sort: null }) });
  }

  return (
    <div className="panel rounded-3xl p-4 sm:p-5">
      <div className="flex flex-col gap-3">
        <div className="flex gap-2.5">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ash"
              aria-hidden="true"
            />
            <label htmlFor="filtro-busca" className="sr-only">
              Buscar por nome, local ou cidade
            </label>
            <Input
              id="filtro-busca"
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por nome, posto, cidade…"
              className="pl-10 pr-10"
              autoComplete="off"
            />
            {search ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Limpar busca"
                className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-ash transition hover:bg-white/10 hover:text-fog"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((open) => !open)}
            aria-expanded={showFilters}
            aria-controls="filtros-avancados"
            className="relative flex h-11 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-night-3/70 px-3.5 text-xs font-bold uppercase tracking-wider text-ash transition hover:border-brand-light/40 hover:text-fog lg:hidden"
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            Filtros
            {activeFiltersCount > 0 ? (
              <span className="flex size-4 items-center justify-center rounded-full bg-brand text-[0.6rem] text-white">
                {activeFiltersCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            onClick={clearAll}
            className="hidden h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-ash transition hover:text-fog lg:flex"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            Limpar
          </button>
        </div>

        <div
          id="filtros-avancados"
          className={cn(
            "grid gap-3 sm:grid-cols-2 lg:grid-cols-6",
            showFilters ? "grid" : "hidden lg:grid",
          )}
        >
          <div>
            <label htmlFor="filtro-cidade" className="sr-only">Cidade</label>
            <Select
              id="filtro-cidade"
              value={city}
              onChange={(event) => update({ city: event.target.value || null })}
            >
              <option value="">Todas as cidades</option>
              {cities.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.value} ({item.count})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="filtro-categoria" className="sr-only">Categoria</label>
            <Select
              id="filtro-categoria"
              value={category}
              onChange={(event) => update({ category: event.target.value || null })}
            >
              <option value="">Todas as categorias</option>
              {EVENT_CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="filtro-periodo" className="sr-only">Período</label>
            <Select
              id="filtro-periodo"
              value={period}
              onChange={(event) =>
                update({ period: event.target.value === "any" ? null : event.target.value })
              }
            >
              {PERIODS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label htmlFor="filtro-data" className="sr-only">Data específica</label>
            <Input
              id="filtro-data"
              type="date"
              value={date}
              onChange={(event) => update({ date: event.target.value || null, period: null })}
              aria-label="Filtrar por data específica"
            />
          </div>

          <div>
            <label htmlFor="filtro-ordem" className="sr-only">Ordenação</label>
            <Select
              id="filtro-ordem"
              value={sort}
              onChange={(event) => update({ sort: event.target.value === "upcoming" ? null : event.target.value })}
            >
              <option value="upcoming">Data mais próxima</option>
              <option value="recent">Recém-publicados</option>
            </Select>
          </div>

          <label className="flex h-11 cursor-pointer items-center gap-2.5 rounded-xl border border-white/10 bg-night-3/70 px-3.5 text-xs font-semibold text-ash transition hover:border-brand-light/35 has-[:checked]:border-brand/45 has-[:checked]:text-fog">
            <input
              type="checkbox"
              checked={withRoute}
              onChange={(event) => update({ withRoute: event.target.checked ? "1" : null })}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              className="flex size-4.5 items-center justify-center rounded-[0.3rem] border border-white/20 bg-night transition peer-checked:border-brand peer-checked:bg-brand peer-checked:[&_svg]:opacity-100"
            >
              <Check className="size-3 text-white opacity-0 transition" />
            </span>
            Somente com rota
          </label>
        </div>

        {chips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-ash">
              Filtros ativos
            </span>
            {chips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                className="group inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-[0.68rem] font-semibold text-brand-light transition hover:border-brand/60"
              >
                {chip.label}
                <X className="size-3 opacity-70 group-hover:opacity-100" aria-hidden="true" />
                <span className="sr-only">Remover filtro</span>
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="text-[0.68rem] font-semibold text-ash underline-offset-2 transition hover:text-fog hover:underline"
            >
              Limpar tudo
            </button>
          </div>
        ) : null}

        <div className="sr-only" aria-live="polite">
          {isPending ? "Atualizando resultados…" : ""}
        </div>
        {isPending ? (
          <div className="absolute inset-x-0 -bottom-10 flex justify-center lg:static">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-night/90 px-3 py-1 text-[0.65rem] text-ash">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" /> Atualizando
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CategoryQuickFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("category") ?? "";

  return (
    <div className="scrollbar-none mt-6 flex gap-2 overflow-x-auto pb-1">
      <button
        type="button"
        onClick={() => {
          const params = new URLSearchParams(searchParams.toString());
          params.delete("category");
          params.delete("page");
          router.push(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false });
        }}
        className={cn(
          "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition",
          !active
            ? "border-brand/50 bg-brand/15 text-fog"
            : "border-white/10 bg-white/[0.03] text-ash hover:border-white/20 hover:text-fog",
        )}
      >
        Todos
      </button>
      {EVENT_CATEGORIES.map((category) => (
        <button
          key={category.value}
          type="button"
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("category", category.value);
            params.delete("page");
            router.push(`${pathname}?${params}`, { scroll: false });
          }}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition",
            active === category.value
              ? "border-brand/50 bg-brand/15 text-fog"
              : "border-white/10 bg-white/[0.03] text-ash hover:border-white/20 hover:text-fog",
          )}
        >
          <CategoryIcon value={category.value} className="size-3.5" />
          {category.short}
        </button>
      ))}
    </div>
  );
}
