import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarPlus, MapPin, ShieldCheck } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { EmptyState } from "@/components/events/empty-state";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAttendingEventIds, getOrganizerProfile } from "@/lib/events";
import { getCurrentUser } from "@/lib/auth";
import { formatMonthYear } from "@/lib/dates";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const organizer = await getOrganizerProfile(id);
  if (!organizer) {
    return { title: "Organizador não encontrado", robots: { index: false, follow: false } };
  }
  const description = `Encontros de moto organizados por ${organizer.name} em Goiânia e região metropolitana. Veja os próximos eventos no MotorMeetings.`;
  return {
    title: `${organizer.name} — Organizador`,
    description,
    alternates: { canonical: `/organizadores/${organizer.id}` },
    openGraph: {
      title: `${organizer.name} — Organizador no MotorMeetings`,
      description,
      url: `/organizadores/${organizer.id}`,
      type: "profile",
    },
  };
}

export default async function OrganizerPage({ params }: PageProps) {
  const { id } = await params;
  const [organizer, user] = await Promise.all([getOrganizerProfile(id), getCurrentUser()]);
  if (!organizer) notFound();

  const attendingIds = user
    ? await getAttendingEventIds(
        user.id,
        organizer.events.map((event) => event.id),
      )
    : new Set<string>();
  const initial = organizer.name.trim().charAt(0).toUpperCase();
  const activeEvents = organizer.events;
  const cities = Array.from(new Set(activeEvents.map((event) => event.city)));

  return (
    <div className="pb-16 pt-28">
      <div className="shell">
        <nav aria-label="Trilha de navegação" className="text-[0.7rem] uppercase tracking-[0.18em] text-ash/70">
          <Link href="/" className="transition hover:text-fog">
            Início
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <Link href="/eventos" className="transition hover:text-fog">
            Eventos
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <span className="text-ash">Organizador</span>
        </nav>

        <header className="relative mt-5 overflow-hidden rounded-[2rem] border border-white/10 bg-night-2/80 p-6 sm:p-9">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-brand/20 blur-[90px]"
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4 sm:items-center">
              <span
                aria-hidden="true"
                className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-brand/30 bg-gradient-to-br from-brand-dark to-brand text-2xl font-extrabold text-white shadow-[0_18px_40px_-18px_rgba(128,0,255,0.9)] sm:size-20 sm:text-3xl"
              >
                {initial}
              </span>
              <div className="min-w-0">
                <p className="eyebrow">Organizador</p>
                <h1 className="display mt-1.5 break-words text-4xl leading-none text-fog sm:text-5xl">
                  {organizer.name}
                </h1>
                <p className="mt-2 text-sm text-ash">
                  No MotorMeetings desde {formatMonthYear(organizer.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-3 sm:items-end">
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">
                  {activeEvents.length}{" "}
                  {activeEvents.length === 1 ? "evento ativo" : "eventos ativos"}
                </Badge>
                {cities.length > 0 ? (
                  <Badge tone="neutral">
                    <MapPin className="mr-1 size-3" aria-hidden="true" />
                    {cities.length === 1 ? cities[0] : `${cities.length} cidades`}
                  </Badge>
                ) : null}
              </div>
              <ButtonLink href="/eventos/criar" variant="secondary" size="md">
                <CalendarPlus className="size-4" aria-hidden="true" />
                Publicar evento
              </ButtonLink>
            </div>
          </div>

          <p className="relative mt-6 flex items-start gap-2 border-t border-white/8 pt-4 text-xs leading-relaxed text-ash">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-light" aria-hidden="true" />
            Perfil público com apenas o nome do organizador e os eventos ativos. Nenhum dado de
            contato ou informação de conta é exibido aqui.
          </p>
        </header>

        <section className="mt-10" aria-labelledby="organizer-events">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Agenda</p>
              <h2 id="organizer-events" className="display mt-2 text-3xl tracking-wide text-fog sm:text-4xl">
                Próximos eventos
              </h2>
            </div>
            <Link
              href="/eventos"
              className="text-xs font-bold uppercase tracking-[0.14em] text-brand-light transition hover:text-brand"
            >
              Ver catálogo completo
            </Link>
          </div>

          {activeEvents.length > 0 ? (
            <Reveal className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {activeEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  priority={index < 3}
                  attending={attendingIds.has(event.id)}
                  authenticated={Boolean(user)}
                />
              ))}
            </Reveal>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={CalendarPlus}
                title="Nenhum evento ativo agora"
                description={`${organizer.name} não tem encontros publicados neste momento. Volte em breve ou explore outros rolês da região.`}
                action={
                  <ButtonLink href="/eventos" variant="secondary" size="md">
                    Explorar eventos
                  </ButtonLink>
                }
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
