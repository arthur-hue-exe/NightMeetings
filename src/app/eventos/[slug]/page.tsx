import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CalendarDays,
  Clock,
  ExternalLink,
  History,
  Instagram,
  MapPin,
  Pencil,
  Route,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { AttendanceControl } from "@/components/events/attendance-control";
import { EventGallery } from "@/components/events/event-gallery";
import { EventImage } from "@/components/events/event-image";
import { RouteTimeline } from "@/components/events/route-timeline";
import { ShareEventButton } from "@/components/events/share-button";
import { CategoryIcon } from "@/components/events/category-icon";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { getEventBySlug, isAttendingEvent } from "@/lib/events";
import { getCurrentUser } from "@/lib/auth";
import { getCategoryLabel } from "@/lib/constants";
import {
  formatDate,
  formatDateLong,
  formatDay,
  formatMonthShort,
  formatMonthYear,
  getTodayISO,
  isEventExpired,
} from "@/lib/dates";
import { absoluteUrl, truncate } from "@/lib/utils";

type PageProps = { params: Promise<{ slug: string }> };

function mapsLink(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function buildDescription(event: Awaited<ReturnType<typeof getEventBySlug>>) {
  if (!event) return "";
  const base =
    event.description?.trim() ||
    `${event.title} em ${event.city}, dia ${formatDate(event.eventDate)} às ${event.startTime}. Concentração em ${event.meetingPoint}.`;
  return truncate(base, 160);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) {
    return { title: "Evento não encontrado", robots: { index: false, follow: false } };
  }

  const today = getTodayISO();
  const expired = isEventExpired(event.endDate, event.eventDate, today);
  const cancelled = event.status === "CANCELLED";
  const cover = absoluteUrl(event.coverImageUrl || "/images/og-default.jpg");
  const description = buildDescription(event);

  return {
    title: `${event.title} — ${formatDate(event.eventDate)}`,
    description,
    alternates: { canonical: `/eventos/${event.slug}` },
    robots: expired || cancelled ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      type: "article",
      locale: "pt_BR",
      url: `/eventos/${event.slug}`,
      title: event.title,
      description,
      siteName: "MotorMeetings",
      images: [{ url: cover, alt: event.title }],
      publishedTime: event.createdAt.toISOString(),
      modifiedTime: event.updatedAt.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: event.title,
      description,
      images: [cover],
    },
  };
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;
  const [event, user] = await Promise.all([getEventBySlug(slug), getCurrentUser()]);

  if (!event) notFound();

  const attending = user ? await isAttendingEvent(event.id, user.id) : false;
  const today = getTodayISO();
  const expired = isEventExpired(event.endDate, event.eventDate, today);
  const cancelled = event.status === "CANCELLED";
  const isOwner = user?.id === event.userId;
  const hasRoute = Boolean(event.departurePoint || event.arrivalPoint);
  const categoryLabel = getCategoryLabel(event.category);
  const locationQuery = `${event.meetingPoint}, ${event.city}, GO`;

  const galleryItems = [
    ...(event.coverImageUrl
      ? [{ url: event.coverImageUrl, alt: `${event.title} — imagem de capa` }]
      : []),
    ...event.images.map((image, index) => ({
      url: image.imageUrl,
      alt: image.altText ?? `${event.title} — foto ${index + 1}`,
    })),
  ];
  const gallery = Array.from(
    new Map(galleryItems.map((item) => [item.url, item])).values(),
  );

  const shareText = `${event.title} — ${formatDate(event.eventDate)} às ${event.startTime}, em ${event.meetingPoint}.`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: buildDescription(event),
    startDate: `${event.eventDate}T${event.startTime}:00-03:00`,
    ...(event.arrivalDate && event.arrivalTime
      ? { endDate: `${event.arrivalDate}T${event.arrivalTime}:00-03:00` }
      : {}),
    eventStatus: cancelled
      ? "https://schema.org/EventCancelled"
      : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url: absoluteUrl(`/eventos/${event.slug}`),
    image: gallery.length > 0 ? gallery.map((image) => absoluteUrl(image.url)) : [absoluteUrl("/images/og-default.jpg")],
    location: {
      "@type": "Place",
      name: event.meetingPoint,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.city,
        addressRegion: "GO",
        addressCountry: "BR",
      },
    },
    organizer: {
      "@type": "Person",
      name: event.user.name,
      url: absoluteUrl(`/organizadores/${event.userId}`),
    },
  };

  return (
    <article className="pb-16 pt-24 lg:pt-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <div className="shell">
        <nav aria-label="Trilha de navegação" className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.16em] text-ash/70">
          <Link href="/eventos" className="inline-flex items-center gap-1 transition hover:text-fog">
            <ArrowLeft className="size-3" aria-hidden="true" />
            Eventos
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate text-ash">{categoryLabel}</span>
        </nav>

        <div className="relative mt-5 overflow-hidden rounded-[2rem] border border-white/8">
          <div className="relative aspect-4/3 w-full sm:aspect-16/9 lg:aspect-21/9">
            <EventImage
              src={event.coverImageUrl || "/images/events/cover-default.webp"}
              alt={`Capa do evento ${event.title}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1200px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-night via-night/45 to-night/10" />

            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="brand">
                  <CategoryIcon value={event.category} className="size-3" />
                  {categoryLabel}
                </Badge>
                {hasRoute ? (
                  <Badge tone="neutral">
                    <Route className="size-3" aria-hidden="true" /> Com rota
                  </Badge>
                ) : null}
                {cancelled ? <Badge tone="danger">Cancelado</Badge> : null}
                {!cancelled && expired ? <Badge tone="warning">Encerrado</Badge> : null}
              </div>

              <h1 className="display mt-3 max-w-4xl text-4xl leading-[0.94] text-fog sm:text-6xl lg:text-7xl">
                {event.title}
              </h1>

              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ash sm:text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-4 text-brand-light" aria-hidden="true" />
                  {formatDateLong(event.eventDate)}
                  {event.endDate ? ` até ${formatDateLong(event.endDate)}` : ""}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-4 text-brand-light" aria-hidden="true" />
                  {event.startTime}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4 text-brand-light" aria-hidden="true" />
                  {event.city}
                </span>
              </div>
            </div>
          </div>
        </div>

        {cancelled ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            <Ban className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">Este evento foi cancelado pelo organizador.</p>
              <p className="mt-1 text-red-200/80">
                O registro permanece disponível para consulta, mas não aparece mais no catálogo.
              </p>
            </div>
          </div>
        ) : expired ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
            <History className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-bold">Este evento já aconteceu.</p>
              <p className="mt-1 text-amber-100/80">
                Ele saiu automaticamente do catálogo público. O registro permanece disponível
                para consulta e compartilhamento.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_23rem] lg:gap-10">
          <div className="order-2 min-w-0 space-y-10 lg:order-1">
            {gallery.length > 0 ? (
              <section aria-labelledby="galeria-titulo" className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 id="galeria-titulo" className="display text-2xl text-fog">Galeria</h2>
                  <p className="text-[0.7rem] uppercase tracking-[0.16em] text-ash">
                    {gallery.length} {gallery.length === 1 ? "foto" : "fotos"}
                  </p>
                </div>
                <EventGallery images={gallery} title={event.title} />
              </section>
            ) : null}

            <section aria-labelledby="sobre-titulo">
              <h2 id="sobre-titulo" className="display text-2xl text-fog">Sobre o encontro</h2>
              <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ash sm:text-base">
                {event.description?.trim() ||
                  "O organizador ainda não adicionou uma descrição para este encontro."}
              </div>
            </section>

            {hasRoute ? (
              <section aria-labelledby="rota-titulo" className="rounded-3xl border border-white/8 bg-night-2/60 p-5 sm:p-7">
                <h2 id="rota-titulo" className="display text-2xl text-fog">Rota do rolê</h2>
                <p className="mt-2 text-xs text-ash">
                  Concentração e horário de saída são momentos diferentes. Planeje sua chegada.
                </p>
                <div className="mt-6">
                  <RouteTimeline
                    data={{
                      eventDate: event.eventDate,
                      startTime: event.startTime,
                      meetingPoint: event.meetingPoint,
                      departurePoint: event.departurePoint,
                      departureTime: event.departureTime,
                      arrivalPoint: event.arrivalPoint,
                      arrivalDate: event.arrivalDate,
                      arrivalTime: event.arrivalTime,
                      routeNotes: event.routeNotes,
                    }}
                  />
                </div>
              </section>
            ) : null}

            {event.additionalInfo ? (
              <section aria-labelledby="info-titulo">
                <h2 id="info-titulo" className="display text-2xl text-fog">Informações adicionais</h2>
                <div className="mt-3 whitespace-pre-line rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-sm leading-relaxed text-ash">
                  {event.additionalInfo}
                </div>
              </section>
            ) : null}

            {event.rules ? (
              <section aria-labelledby="regras-titulo">
                <h2 id="regras-titulo" className="flex items-center gap-2 display text-2xl text-fog">
                  <ShieldAlert className="size-5 text-brand-light" aria-hidden="true" />
                  Regras do evento
                </h2>
                <div className="mt-3 whitespace-pre-line rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-5 text-sm leading-relaxed text-amber-100/90">
                  {event.rules}
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
              <p className="flex items-start gap-2.5 text-xs leading-relaxed text-ash">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-brand-light" aria-hidden="true" />
                As informações do evento são publicadas pelo organizador. Confirme data, horário e
                local antes de sair de casa. O MotorMeetings não intermedeia pagamentos ou reservas.
              </p>
            </section>
          </div>

          <aside className="order-1 space-y-5 lg:order-2">
            <div className="panel sticky top-24 space-y-5 rounded-3xl p-5 sm:p-6">
              <div className="flex items-start gap-3.5">
                <div className="flex w-16 shrink-0 flex-col items-center rounded-2xl border border-brand/25 bg-brand/10 px-2 py-2.5">
                  <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.2em] text-brand-light">
                    {formatMonthShort(event.eventDate)}
                  </span>
                  <span className="font-display text-3xl leading-none text-fog">
                    {formatDay(event.eventDate)}
                  </span>
                  <span className="mt-0.5 text-[0.55rem] font-bold uppercase tracking-[0.18em] text-ash">
                    {formatDate(event.eventDate).slice(-4)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-ash">
                    {formatDateLong(event.eventDate)}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-fog">
                    <Clock className="size-4 text-brand-light" aria-hidden="true" />
                    {event.startTime}
                  </p>
                  <p className="mt-1 text-xs text-ash">{event.city}</p>
                </div>
              </div>

              <div className="hairline" />

              <div className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand-light" aria-hidden="true" />
                  <div>
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-ash">
                      Ponto de encontro
                    </p>
                    <p className="mt-0.5 text-fog">{event.meetingPoint}</p>
                    <a
                      href={mapsLink(locationQuery)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-light transition hover:text-brand"
                    >
                      Abrir no Google Maps
                      <ExternalLink className="size-3" aria-hidden="true" />
                      <span className="sr-only">(abre em nova aba)</span>
                    </a>
                  </div>
                </div>

                {event.departurePoint ? (
                  <div className="flex gap-3">
                    <Route className="mt-0.5 size-4 shrink-0 text-brand-light" aria-hidden="true" />
                    <div>
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-ash">
                        Saída {event.departureTime ? `· ${event.departureTime}` : ""}
                      </p>
                      <p className="mt-0.5 text-fog">{event.departurePoint}</p>
                    </div>
                  </div>
                ) : null}

                {event.arrivalPoint ? (
                  <div className="flex gap-3">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-ash" aria-hidden="true" />
                    <div>
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-ash">
                        Chegada {event.arrivalTime ? `· ${event.arrivalTime}` : ""}
                      </p>
                      <p className="mt-0.5 text-fog">{event.arrivalPoint}</p>
                      {event.arrivalDate ? (
                        <p className="mt-0.5 text-xs text-ash">
                          {formatDate(event.arrivalDate)}
                          {event.arrivalDate > event.eventDate ? " · dia seguinte" : ""}
                        </p>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="hairline" />

              <AttendanceControl
                eventId={event.id}
                slug={event.slug}
                initialAttending={attending}
                initialCount={event._count.attendances}
                authenticated={Boolean(user)}
                disabled={cancelled || expired}
                disabledLabel={
                  cancelled ? "Evento cancelado pelo organizador" : "Evento encerrado"
                }
                layout="detail"
              />

              <div className="hairline" />

              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-brand-dark to-brand text-sm font-extrabold uppercase text-white">
                  {event.user.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-ash">
                    Organizador
                  </p>
                  <Link
                    href={`/organizadores/${event.userId}`}
                    className="truncate text-sm font-semibold text-fog transition hover:text-brand-light"
                  >
                    {event.user.name}
                  </Link>
                </div>
                <Link
                  href={`/organizadores/${event.userId}`}
                  aria-label={`Ver perfil de ${event.user.name}`}
                  className="flex size-8 items-center justify-center rounded-full border border-white/10 text-ash transition hover:border-brand-light/40 hover:text-fog"
                >
                  <UserRound className="size-4" aria-hidden="true" />
                </Link>
              </div>

              {event.contactInstagram ? (
                <a
                  href={`https://www.instagram.com/${event.contactInstagram}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-brand-light transition hover:text-brand"
                >
                  <Instagram className="size-3.5" aria-hidden="true" />
                  @{event.contactInstagram}
                  <span className="sr-only">(abre em nova aba)</span>
                </a>
              ) : null}

              <ShareEventButton
                title={event.title}
                text={shareText}
                path={`/eventos/${event.slug}`}
              />

              <p className="text-center text-[0.68rem] text-ash/60">
                Desde {formatMonthYear(event.user.createdAt)} na comunidade
              </p>

              {isOwner ? (
                <div className="space-y-2 border-t border-white/8 pt-4">
                  <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-brand-light">
                    Você organiza este evento
                  </p>
                  <div className="flex gap-2">
                    {!expired ? (
                      <ButtonLink
                        href={`/eventos/${event.slug}/editar`}
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" /> Editar
                      </ButtonLink>
                    ) : null}
                    <ButtonLink href="/meus-eventos" variant="ghost" size="sm" className="flex-1">
                      Gerenciar
                    </ButtonLink>
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}
