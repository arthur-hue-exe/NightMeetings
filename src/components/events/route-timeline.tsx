import { CalendarDays, Clock, Flag, MapPin, Navigation, type LucideIcon } from "lucide-react";
import { formatDate, isArrivalNextDay } from "@/lib/dates";
import { cn } from "@/lib/utils";

type TimelineStep = {
  key: string;
  label: string;
  icon: LucideIcon;
  point: string;
  time: string;
  date: string;
  tone: "brand" | "light";
  query: string;
};

export type TimelineData = {
  eventDate: string;
  startTime: string;
  meetingPoint: string;
  departurePoint: string | null;
  departureTime: string | null;
  arrivalPoint: string | null;
  arrivalDate: string | null;
  arrivalTime: string | null;
  routeNotes?: string | null;
};

function mapsLink(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function RouteTimeline({
  data,
  variant = "full",
  className,
}: {
  data: TimelineData;
  variant?: "full" | "compact";
  className?: string;
}) {
  const steps: TimelineStep[] = [
    {
      key: "meeting",
      label: "Concentração",
      icon: MapPin,
      point: data.meetingPoint,
      time: data.startTime,
      date: data.eventDate,
      tone: "brand" as const,
      query: data.meetingPoint,
    },
  ];

  if (data.departurePoint && data.departureTime) {
    steps.push({
      key: "departure",
      label: "Saída",
      icon: Navigation,
      point: data.departurePoint,
      time: data.departureTime,
      date: data.eventDate,
      tone: "light" as const,
      query: data.departurePoint,
    });
  }

  if (data.arrivalPoint) {
    steps.push({
      key: "arrival",
      label: "Chegada",
      icon: Flag,
      point: data.arrivalPoint,
      time: data.arrivalTime ?? "",
      date: data.arrivalDate ?? data.eventDate,
      tone: "light" as const,
      query: data.arrivalPoint,
    });
  }

  const arrivalNextDay = isArrivalNextDay(data.eventDate, data.arrivalDate);

  return (
    <div className={cn("relative", className)}>
      {variant === "full" ? (
        <div className="mb-6 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-light">
          <Clock className="size-4" aria-hidden="true" />
          Roteiro do encontro
        </div>
      ) : null}

      <ol className="relative space-y-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isLast = index === steps.length - 1;
          return (
            <li key={step.key} className="relative flex gap-4">
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className="absolute left-[1.05rem] top-9 h-[calc(100%+0.2rem)] w-px bg-gradient-to-b from-brand/60 via-brand/25 to-transparent"
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex size-[2.15rem] shrink-0 items-center justify-center rounded-full border",
                  step.tone === "brand"
                    ? "border-brand/50 bg-brand/15 text-brand-light shadow-[0_0_20px_-4px_rgba(128,0,255,0.8)]"
                    : "border-white/15 bg-night-3 text-fog",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-ash">
                    {step.label}
                  </p>
                  {step.time ? (
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[0.68rem] font-bold text-fog">
                      {step.time}
                    </span>
                  ) : null}
                  {step.key === "arrival" && arrivalNextDay ? (
                    <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-amber-300">
                      Dia seguinte · {formatDate(step.date)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-fog">{step.point}</p>
                {variant === "full" ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-[0.7rem] text-ash">
                      <CalendarDays className="size-3" aria-hidden="true" />
                      {formatDate(step.date)}
                    </span>
                    <a
                      href={mapsLink(step.query)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[0.7rem] font-semibold text-brand-light transition hover:text-brand"
                    >
                      Abrir no Google Maps
                      <span className="sr-only">(abre em nova aba)</span>
                    </a>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {variant === "full" && data.routeNotes ? (
        <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.03] p-3.5 text-xs leading-relaxed text-ash">
          <span className="font-bold uppercase tracking-wider text-fog">Sobre o trajeto: </span>
          {data.routeNotes}
        </div>
      ) : null}
    </div>
  );
}
