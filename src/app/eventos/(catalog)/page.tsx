import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { CalendarClock, CalendarSearch, Search } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { EventFilters } from "@/components/events/event-filters";
import { Pagination } from "@/components/events/pagination";
import { EmptyState } from "@/components/events/empty-state";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_VALUES, EVENT_CATEGORIES } from "@/lib/constants";
import { isValidISODate } from "@/lib/dates";
import {
  getAttendingEventIds,
  getFilterOptions,
  searchEvents,
  type EventPeriod,
  type EventSort,
} from "@/lib/events";
import { getCurrentUser } from "@/lib/auth";
import type { CategoryValue } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Explorar eventos",
  description:
    "Catálogo de encontros de motos em Goiânia, Aparecida de Goiânia e região metropolitana. Filtre por cidade, categoria, data e eventos com rota.",
  alternates: { canonical: "/eventos" },
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function asCategory(value: string | undefined): CategoryValue | undefined {
  return value && (CATEGORY_VALUES as readonly string[]).includes(value)
    ? (value as CategoryValue)
    : undefined;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = first(params.q)?.trim().slice(0, 80) || undefined;
  const city = first(params.city)?.trim().slice(0, 60) || undefined;
  const category = asCategory(first(params.category));
  const dateRaw = first(params.date);
  const date = dateRaw && isValidISODate(dateRaw) ? dateRaw : undefined;
  const periodRaw = first(params.period);
  const period: EventPeriod | undefined = ["today", "weekend", "month"].includes(periodRaw ?? "")
    ? (periodRaw as EventPeriod)
    : undefined;
  const sort: EventSort = first(params.sort) === "recent" ? "recent" : "upcoming";
  const withRoute = first(params.withRoute) === "1";
  const pageRaw = Number(first(params.page) ?? "1");
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;

  const [result, options, user] = await Promise.all([
    searchEvents({ q, city, category, date, period, withRoute, sort, page }),
    getFilterOptions(),
    getCurrentUser(),
  ]);
  const attendingIds = user
    ? await getAttendingEventIds(
        user.id,
        result.events.map((event) => event.id),
      )
    : new Set<string>();

  const activeFiltersCount = [
    q,
    city,
    category,
    period,
    date,
    withRoute ? "1" : undefined,
    sort === "recent" ? "1" : undefined,
  ].filter(Boolean).length;

  const hasFilters = activeFiltersCount > 0;

  const categoryLabel = category
    ? EVENT_CATEGORIES.find((item) => item.value === category)?.label
    : undefined;

  function buildHref(targetPage: number) {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (city) query.set("city", city);
    if (category) query.set("category", category);
    if (date) query.set("date", date);
    if (period) query.set("period", period);
    if (withRoute) query.set("withRoute", "1");
    if (sort === "recent") query.set("sort", "recent");
    if (targetPage > 1) query.set("page", String(targetPage));
    const suffix = query.toString();
    return `/eventos${suffix ? `?${suffix}` : ""}`;
  }

  return (
    <div className="pb-10 pt-28 lg:pt-32">
      <div className="shell">
        <nav aria-label="Trilha de navegação" className="text-[0.7rem] uppercase tracking-[0.18em] text-ash/70">
          <Link href="/" className="transition hover:text-fog">
            Início
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <span className="text-ash">Eventos</span>
        </nav>

        <header className="mt-5 max-w-3xl">
          <p className="eyebrow">Catálogo da região</p>
          <h1 className="display mt-3 text-5xl leading-[0.92] text-fog sm:text-6xl lg:text-7xl">
            Explore <span className="text-gradient">eventos</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ash sm:text-base">
            Encontros de motos em Goiânia, Aparecida e região metropolitana. Use os filtros
            para encontrar o rolê com a sua vibe — eventos passados saem automaticamente do catálogo.
          </p>
        </header>

        <div className="mt-8">
          <Suspense
            fallback={
              <div className="panel h-40 animate-pulse rounded-3xl" aria-hidden="true" />
            }
          >
            <EventFilters cities={options.cities} activeFiltersCount={activeFiltersCount} />
          </Suspense>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="text-sm text-ash" aria-live="polite">
              <span className="font-bold text-fog">{result.total}</span>{" "}
              {result.total === 1 ? "encontro encontrado" : "encontros encontrados"}
            </p>
            {categoryLabel ? <Badge tone="brand">{categoryLabel}</Badge> : null}
            {date ? (
              <Badge tone="neutral">Data: {date.split("-").reverse().join("/")}</Badge>
            ) : null}
          </div>
          <p className="text-xs text-ash/70">
            Página {result.page} de {result.totalPages}
          </p>
        </div>

        <section className="mt-5" aria-label="Resultados do catálogo">
          {result.events.length > 0 ? (
            <Reveal className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {result.events.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  priority={index < 3}
                  attending={attendingIds.has(event.id)}
                  authenticated={Boolean(user)}
                />
              ))}
            </Reveal>
          ) : hasFilters ? (
            <EmptyState
              icon={CalendarSearch}
              title="Nenhum encontro com esses filtros"
              description="Tente outra cidade, categoria ou período. Você também pode limpar todos os filtros e ver o catálogo completo."
              action={
                <ButtonLink href="/eventos" size="md" variant="secondary">
                  Limpar filtros
                </ButtonLink>
              }
            />
          ) : (
            <EmptyState
              icon={CalendarClock}
              title="Catálogo vazio por enquanto"
              description="Ainda não há eventos ativos publicados. Seja o primeiro a organizar um encontro em Goiânia ou região."
              action={
                <ButtonLink href="/eventos/criar" size="md">
                  Publicar o primeiro evento
                </ButtonLink>
              }
            />
          )}
        </section>

        <Pagination page={result.page} totalPages={result.totalPages} buildHref={buildHref} />

        <p className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-ash/60">
          <Search className="size-3.5" aria-hidden="true" />
          Eventos expirados não aparecem na busca nem nas listagens públicas.
        </p>
      </div>
    </div>
  );
}
