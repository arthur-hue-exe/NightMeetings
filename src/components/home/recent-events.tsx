import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { EventImage } from "@/components/events/event-image";
import { formatDate } from "@/lib/dates";
import { getCategoryLabel } from "@/lib/constants";
import type { EventListItem } from "@/lib/events";

export function RecentEvents({ events }: { events: EventListItem[] }) {
  return (
    <ul className="divide-y divide-white/6 overflow-hidden rounded-3xl border border-white/8 bg-night-2/60">
      {events.map((event) => (
        <li key={event.id}>
          <Link
            href={`/eventos/${event.slug}`}
            className="group flex items-center gap-4 px-4 py-4 transition hover:bg-white/[0.035] sm:px-5"
          >
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/8 sm:size-20">
              <EventImage
                src={event.coverImageUrl || "/images/events/cover-default.webp"}
                alt=""
                fill
                sizes="80px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-brand-light">
                {getCategoryLabel(event.category)}
              </p>
              <h3 className="mt-0.5 line-clamp-1 font-display text-xl tracking-wide text-fog group-hover:text-white">
                {event.title}
              </h3>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.72rem] text-ash">
                <span>{formatDate(event.eventDate)} · {event.startTime}</span>
                <span aria-hidden="true" className="text-ash/40">·</span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3" aria-hidden="true" />
                  {event.city}
                </span>
              </p>
            </div>
            <span className="hidden shrink-0 text-xs font-semibold text-ash transition group-hover:text-brand-light sm:inline-flex sm:items-center sm:gap-1">
              Ver
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
