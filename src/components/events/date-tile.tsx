import { formatDay, formatMonthShort, formatWeekdayShort } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function DateTile({ date, className }: { date: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex w-14 flex-col items-center rounded-xl border border-white/12 bg-night/75 px-1 py-2 backdrop-blur-md",
        className,
      )}
      aria-hidden="true"
    >
      <span className="text-[0.6rem] font-extrabold uppercase tracking-[0.2em] text-brand-light">
        {formatMonthShort(date)}
      </span>
      <span className="mt-0.5 font-display text-2xl leading-none text-fog">{formatDay(date)}</span>
      <span className="mt-0.5 text-[0.55rem] font-bold uppercase tracking-widest text-ash">
        {formatWeekdayShort(date)}
      </span>
    </div>
  );
}
