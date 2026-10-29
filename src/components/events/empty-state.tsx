import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/12 bg-white/[0.02] px-6 py-16 text-center",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-2xl border border-brand/25 bg-brand/10 text-brand-light">
        <Icon className="size-6" aria-hidden="true" />
      </span>
      <h3 className="display mt-5 text-2xl tracking-wide text-fog">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ash">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
