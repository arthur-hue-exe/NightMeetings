import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock, MapPin, Route } from "lucide-react";
import { EventImage } from "@/components/events/event-image";
import { DateTile } from "@/components/events/date-tile";
import { CategoryIcon } from "@/components/events/category-icon";
import { getCategoryLabel } from "@/lib/constants";
import { formatDate, formatWeekdayShort } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { EventListItem } from "@/lib/events";

export function EventCard({
  event,
  className,
  priority = false,
}: {
  event: EventListItem;
  className?: string;
  priority?: boolean;
}) {
  const hasRoute = Boolean(event.departurePoint || event.arrivalPoint);
  const cover = event.coverImageUrl || "/images/events/cover-default.webp";

  return (
    <Link
      href={`/eventos/${event.slug}`}
      aria-label={`Ver detalhes de ${event.title}`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[1.6rem] border border-white/8 bg-night-2/90 transition duration-300 hover:-translate-y-1.5 hover:border-brand/45 hover:shadow-[0_28px_60px_-30px_rgba(128,0,255,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light/70",
        className,
      )}
    >
      <div className="relative aspect-16/10 overflow-hidden">
        <EventImage
          src={cover}
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 30vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-night via-night/25 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-night/55 to-transparent" />

        <DateTile date={event.eventDate} className="absolute left-4 top-4" />

        <div className="absolute right-4 top-4 flex max-w-[65%] items-center gap-1.5 rounded-full border border-white/12 bg-night/70 px-2.5 py-1.5 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-fog backdrop-blur-md">
          <CategoryIcon value={event.category} className="size-3.5 text-brand-light" />
          <span className="truncate">{getCategoryLabel(event.category)}</span>
        </div>

        {hasRoute ? (
          <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-brand/35 bg-brand/15 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-brand-light backdrop-blur-md">
            <Route className="size-3" aria-hidden="true" />
            Com rota
          </span>
        ) : null}

        {event.status === "CANCELLED" ? (
          <span className="absolute bottom-4 right-4 rounded-full border border-red-400/40 bg-night/80 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-red-300 backdrop-blur-md">
            Cancelado
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-5">
        <h3 className="line-clamp-2 font-display text-[1.65rem] leading-[1.02] tracking-wide text-fog transition-colors group-hover:text-white">
          {event.title}
        </h3>

        <div className="space-y-1.5 text-[0.78rem] text-ash">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 shrink-0 text-brand-light/80" aria-hidden="true" />
            <span>
              {formatWeekdayShort(event.eventDate)}, {formatDate(event.eventDate)}
              {event.endDate ? ` até ${formatDate(event.endDate)}` : ""}
            </span>
          </p>
          <p className="flex items-center gap-1.5">
            <Clock className="size-3.5 shrink-0 text-brand-light/80" aria-hidden="true" />
            <span>{event.startTime}</span>
            <span className="text-ash/40" aria-hidden="true">
              ·
            </span>
            <MapPin className="size-3.5 shrink-0 text-brand-light/80" aria-hidden="true" />
            <span className="truncate">{event.city}</span>
          </p>
          <p className="truncate pl-5 text-ash/75">{event.meetingPoint}</p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/6 pt-3.5">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-dark to-brand text-[0.6rem] font-extrabold uppercase text-white">
              {event.user.name.slice(0, 1)}
            </span>
            <span className="truncate text-xs text-ash">{event.user.name}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-brand-light">
            Detalhes
            <ArrowUpRight
              className="size-3.5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
