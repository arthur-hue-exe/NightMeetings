export const SAO_PAULO_TZ = "America/Sao_Paulo";

const dateFormatterCache = new Map<string, Intl.DateTimeFormat>();

function formatter(options: Intl.DateTimeFormatOptions) {
  const key = JSON.stringify(options);
  const cached = dateFormatterCache.get(key);
  if (cached) return cached;
  const created = new Intl.DateTimeFormat("pt-BR", { timeZone: SAO_PAULO_TZ, ...options });
  dateFormatterCache.set(key, created);
  return created;
}

/** Data de hoje no fuso America/Sao_Paulo, no formato YYYY-MM-DD. */
export function getTodayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SAO_PAULO_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function parseISODate(iso: string): Date {
  return new Date(`${iso}T12:00:00-03:00`);
}

export function isValidISODate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function addDaysISO(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function compareISODate(a: string, b: string) {
  return a.localeCompare(b);
}

export function formatDate(iso: string) {
  return formatter({ day: "2-digit", month: "2-digit", year: "numeric" }).format(parseISODate(iso));
}

export function formatDateLong(iso: string) {
  const raw = formatter({
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parseISODate(iso));
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function formatWeekdayShort(iso: string) {
  return formatter({ weekday: "short" }).format(parseISODate(iso)).replace(".", "");
}

export function formatDay(iso: string) {
  return formatter({ day: "2-digit" }).format(parseISODate(iso));
}

export function formatMonthShort(iso: string) {
  return formatter({ month: "short" }).format(parseISODate(iso)).replace(".", "").toUpperCase();
}

export function formatMonthLong(iso: string) {
  return formatter({ month: "long" }).format(parseISODate(iso));
}

export function formatMonthYear(date: Date) {
  return formatter({ month: "long", year: "numeric" }).format(date);
}

export function formatTime(time: string) {
  return time;
}

export function isBefore(dateA: string, dateB: string) {
  return dateA < dateB;
}

export function isEventExpired(endDate: string | null, eventDate: string, today = getTodayISO()) {
  return (endDate ?? eventDate) < today;
}

export function isEventActive(
  event: { eventDate: string; endDate: string | null; status: string },
  today = getTodayISO(),
) {
  return event.status === "ACTIVE" && (event.endDate ?? event.eventDate) >= today;
}

export function isArrivalNextDay(eventDate: string, arrivalDate: string | null | undefined) {
  return Boolean(arrivalDate && arrivalDate > eventDate);
}

/** Sábado e domingo do fim de semana corrente/próximo (inclui o dia atual). */
export function getWeekendDates(today = getTodayISO()) {
  const date = parseISODate(today);
  const weekday = date.getUTCDay(); // 0 domingo, 6 sábado
  let saturday: string;
  let sunday: string;
  if (weekday === 0) {
    sunday = today;
    saturday = addDaysISO(today, -1);
  } else if (weekday === 6) {
    saturday = today;
    sunday = addDaysISO(today, 1);
  } else {
    const untilSaturday = 6 - weekday;
    saturday = addDaysISO(today, untilSaturday);
    sunday = addDaysISO(today, untilSaturday + 1);
  }
  return { saturday, sunday };
}

export function getMonthRange(today = getTodayISO()) {
  const start = `${today.slice(0, 7)}-01`;
  const [year, month] = today.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  return { start, end: `${today.slice(0, 7)}-${String(lastDay).padStart(2, "0")}` };
}

export function nextDayLabel(arrivalDate: string) {
  return `Dia seguinte · ${formatDate(arrivalDate)}`;
}
