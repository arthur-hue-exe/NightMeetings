import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CategoryIcon } from "@/components/events/category-icon";
import { EVENT_CATEGORIES } from "@/lib/constants";

export function CategoryTile({
  category,
  count,
}: {
  category: (typeof EVENT_CATEGORIES)[number];
  count: number;
}) {
  return (
    <Link
      href={`/eventos?category=${category.value}`}
      className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/8 bg-night-2/70 p-5 transition duration-300 hover:-translate-y-1 hover:border-brand/45 hover:bg-night-2"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-brand/10 blur-2xl transition group-hover:bg-brand/20"
      />
      <span className="flex size-11 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brand-light transition group-hover:border-brand/50 group-hover:bg-brand/15">
        <CategoryIcon value={category.value} />
      </span>
      <div>
        <h3 className="text-sm font-bold text-fog">{category.label}</h3>
        <p className="mt-1 text-xs text-ash">
          {count > 0 ? `${count} ${count === 1 ? "encontro ativo" : "encontros ativos"}` : "Em breve"}
        </p>
      </div>
      <ArrowUpRight
        className="absolute right-4 top-4 size-4 text-ash/60 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-light"
        aria-hidden="true"
      />
    </Link>
  );
}
