import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CalendarDays, CalendarX2, MapPin, Plus, Sparkles } from "lucide-react";
import { EventImage } from "@/components/events/event-image";
import { ManageEventActions } from "@/components/events/manage-event-actions";
import { EmptyState } from "@/components/events/empty-state";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getCategoryLabel } from "@/lib/constants";
import { formatDate, getTodayISO, isEventExpired } from "@/lib/dates";
import { getMyEvents } from "@/lib/events";

export const metadata: Metadata = {
  title: "Meus eventos",
  robots: { index: false, follow: false },
};

type MyEvent = Awaited<ReturnType<typeof getMyEvents>>[number];

function EventRow({ event, expired }: { event: MyEvent; expired: boolean }) {
  const cancelled = event.status === "CANCELLED";
  const cover = event.coverImageUrl || "/images/events/cover-default.webp";

  return (
    <article className="group grid overflow-hidden rounded-2xl border border-white/8 bg-night-2/80 transition hover:border-brand/35 sm:grid-cols-[210px_1fr]">
      <Link
        href={`/eventos/${event.slug}`}
        className="relative block aspect-16/10 overflow-hidden bg-night-3 sm:aspect-auto sm:h-full"
        aria-label={`Ver ${event.title}`}
      >
        <EventImage
          src={cover}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 210px"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night/70 via-transparent to-transparent sm:bg-gradient-to-r" />
        {cancelled ? (
          <span className="absolute left-3 top-3 rounded-full border border-red-400/40 bg-night/85 px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-red-300 backdrop-blur">
            Cancelado
          </span>
        ) : expired ? (
          <span className="absolute left-3 top-3 rounded-full border border-white/20 bg-night/85 px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-ash backdrop-blur">
            Encerrado
          </span>
        ) : (
          <span className="absolute left-3 top-3 rounded-full border border-emerald-400/35 bg-night/85 px-2.5 py-1 text-[0.58rem] font-bold uppercase tracking-[0.12em] text-emerald-300 backdrop-blur">
            No ar
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-col gap-3 p-4 sm:p-5">
        <div>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-brand-light">
            {getCategoryLabel(event.category)}
          </p>
          <Link href={`/eventos/${event.slug}`} className="mt-1 block">
            <h3 className="line-clamp-2 font-display text-2xl leading-none tracking-wide text-fog transition group-hover:text-white">
              {event.title}
            </h3>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ash">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5 text-brand-light/80" aria-hidden="true" />
            {formatDate(event.eventDate)}
            {event.endDate ? ` até ${formatDate(event.endDate)}` : ""} · {event.startTime}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5 text-brand-light/80" aria-hidden="true" />
            {event.city}
          </span>
        </div>

        {event.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-ash/80">{event.description}</p>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-white/6 pt-3">
          <ManageEventActions
            eventId={event.id}
            slug={event.slug}
            title={event.title}
            status={cancelled ? "CANCELLED" : "ACTIVE"}
            expired={expired}
          />
          <Link
            href={`/eventos/${event.slug}`}
            className="inline-flex items-center gap-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-brand-light transition hover:text-brand"
          >
            Ver página
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="display text-3xl tracking-wide text-fog">{title}</h2>
          <p className="mt-1 text-xs text-ash">{description}</p>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export default async function MyEventsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/entrar?next=${encodeURIComponent("/meus-eventos")}`);
  }

  const events = await getMyEvents(user.id);
  const today = getTodayISO();

  const active = events
    .filter((event) => event.status === "ACTIVE" && !isEventExpired(event.endDate, event.eventDate, today))
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const cancelled = events.filter((event) => event.status === "CANCELLED");
  const expired = events.filter(
    (event) => event.status === "ACTIVE" && isEventExpired(event.endDate, event.eventDate, today),
  );

  return (
    <div className="shell pb-14 pt-28">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Organizador</p>
          <h1 className="display mt-2 text-5xl text-fog sm:text-6xl">Meus eventos</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">
            Acompanhe os rolês que você publicou, atualize informações e encerre o que não vai mais
            acontecer. Só você pode editar ou excluir seus eventos.
          </p>
        </div>
        <ButtonLink href="/eventos/criar" variant="primary" size="lg">
          <Plus className="size-4" aria-hidden="true" />
          Criar novo evento
        </ButtonLink>
      </div>

      {events.length > 0 ? (
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="panel rounded-2xl p-4">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ash">No ar</p>
            <p className="display mt-1 text-4xl text-fog">{active.length}</p>
            <p className="mt-1 text-xs text-ash">Visíveis no catálogo público</p>
          </div>
          <div className="panel rounded-2xl p-4">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ash">
              Cancelados
            </p>
            <p className="display mt-1 text-4xl text-fog">{cancelled.length}</p>
            <p className="mt-1 text-xs text-ash">Fora das listas públicas</p>
          </div>
          <div className="panel rounded-2xl p-4">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ash">
              Encerrados
            </p>
            <p className="display mt-1 text-4xl text-fog">{expired.length}</p>
            <p className="mt-1 text-xs text-ash">Continuam acessíveis pelo link</p>
          </div>
        </div>
      ) : null}

      {events.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Sparkles}
            title="Seu primeiro rolê começa aqui"
            description="Você ainda não publicou nenhum evento. Crie um encontro, uma rota ou um passeio e compartilhe com a galera."
            action={
              <ButtonLink href="/eventos/criar" variant="primary" size="lg">
                <Plus className="size-4" aria-hidden="true" />
                Criar meu evento
              </ButtonLink>
            }
          />
        </div>
      ) : null}

      {active.length > 0 ? (
        <Section
          title="No ar"
          description="Eventos ativos que estão sendo exibidos no catálogo."
        >
          {active.map((event) => (
            <EventRow key={event.id} event={event} expired={false} />
          ))}
        </Section>
      ) : null}

      {cancelled.length > 0 ? (
        <Section
          title="Cancelados"
          description="Continuam no seu histórico, mas não aparecem no catálogo."
        >
          {cancelled.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              expired={isEventExpired(event.endDate, event.eventDate, today)}
            />
          ))}
        </Section>
      ) : null}

      {expired.length > 0 ? (
        <Section
          title="Encerrados"
          description="Eventos que já passaram da data final. Não podem mais ser editados."
        >
          {expired.map((event) => (
            <EventRow key={event.id} event={event} expired />
          ))}
        </Section>
      ) : null}

      {events.length > 0 ? (
        <div className="mt-10 flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-ash">
            <CalendarX2 className="mt-0.5 size-4 shrink-0 text-brand-light/70" aria-hidden="true" />
            Os eventos saem do catálogo automaticamente após o último dia. Os registros continuam
            preservados no seu histórico.
          </p>
          <Badge tone="neutral" className="shrink-0 self-start sm:self-auto">
            Regra automática
          </Badge>
        </div>
      ) : null}
    </div>
  );
}
