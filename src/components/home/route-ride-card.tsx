import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Route } from "lucide-react";
import { AttendanceControl } from "@/components/events/attendance-control";
import { EventImage } from "@/components/events/event-image";
import { isArrivalNextDay } from "@/lib/dates";
import { formatDate, formatWeekdayShort } from "@/lib/dates";
import { getCategoryLabel } from "@/lib/constants";
import type { EventListItem } from "@/lib/events";

export function RouteRideCard({
  event,
  attending = false,
  authenticated = false,
}: {
  event: EventListItem;
  attending?: boolean;
  authenticated?: boolean;
}) {
  const cover = event.coverImageUrl || "/images/events/cover-default.webp";
  const nextDay = isArrivalNextDay(event.eventDate, event.arrivalDate);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/8 bg-night-2/90 p-4 transition duration-300 hover:-translate-y-1 hover:border-brand/45 hover:shadow-[0_24px_50px_-30px_rgba(128,0,255,0.55)]">
      <Link
        href={`/eventos/${event.slug}`}
        aria-label={`Ver detalhes de ${event.title}`}
        className="flex flex-1 flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/70"
      >
        <div className="flex gap-3.5">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-2xl border border-white/8">
            <EventImage
              src={cover}
              alt=""
              fill
              sizes="80px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-night/60 to-transparent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="inline-flex items-center gap-1 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-brand-light">
              <Route className="size-3" aria-hidden="true" />
              {getCategoryLabel(event.category)}
            </p>
            <h3 className="mt-1 line-clamp-2 font-display text-xl leading-tight tracking-wide text-fog group-hover:text-white">
              {event.title}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-[0.7rem] text-ash">
              <CalendarDays className="size-3" aria-hidden="true" />
              {formatWeekdayShort(event.eventDate)}, {formatDate(event.eventDate)}
            </p>
          </div>
          <ArrowUpRight
            className="size-4 shrink-0 text-ash transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-light"
            aria-hidden="true"
          />
        </div>

        <div className="mt-4 flex flex-1 flex-col rounded-2xl border border-white/6 bg-night-3/55 p-3.5">
          <div className="flex gap-3">
            <div aria-hidden="true" className="flex flex-col items-center pt-1">
              <span className="size-2 rounded-full bg-brand shadow-[0_0_10px_rgba(128,0,255,0.9)]" />
              <span className="my-1 h-8 w-px bg-gradient-to-b from-brand/70 to-white/20" />
              <span className="size-2 rounded-full border border-ash/60 bg-night" />
            </div>
            <ol className="flex flex-1 flex-col justify-between gap-2.5 text-xs">
              <li>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-ash">
                  Encontro · {event.startTime}
                </p>
                <p className="mt-0.5 truncate text-fog">{event.meetingPoint}</p>
              </li>
              <li>
                <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-ash">
                  {event.arrivalPoint
                    ? `Chegada${event.arrivalTime ? ` · ${event.arrivalTime}` : ""}`
                    : "Saída"}
                </p>
                <p className="mt-0.5 truncate text-fog">
                  {event.arrivalPoint ?? event.departurePoint ?? event.city}
                </p>
              </li>
            </ol>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/6 pt-2.5 text-[0.65rem] text-ash">
            <span className="inline-flex items-center gap-1 truncate">
              <MapPin className="size-3" aria-hidden="true" />
              {event.city}
            </span>
            {nextDay ? (
              <span className="shrink-0 text-amber-300">Chega no dia seguinte</span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="mt-3 border-t border-white/6 pt-3">
        <AttendanceControl
          eventId={event.id}
          slug={event.slug}
          initialAttending={attending}
          initialCount={event._count.attendances}
          authenticated={authenticated}
        />
      </div>
    </article>
  );
}
