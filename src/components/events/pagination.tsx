import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (item) => item === 1 || item === totalPages || Math.abs(item - page) <= 1,
  );

  return (
    <nav aria-label="Paginação" className="mt-12 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link
          href={buildHref(page - 1)}
          aria-label="Página anterior"
          className="flex size-10 items-center justify-center rounded-full border border-white/10 text-ash transition hover:border-brand-light/40 hover:text-fog"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-full border border-white/5 text-ash/30"
        >
          <ChevronLeft className="size-4" />
        </span>
      )}

      {pages.map((item, index) => {
        const previous = pages[index - 1];
        const gap = previous !== undefined && item - previous > 1;
        return (
          <span key={item} className="flex items-center gap-1.5">
            {gap ? <span className="px-1 text-xs text-ash/50">…</span> : null}
            <Link
              href={buildHref(item)}
              aria-current={item === page ? "page" : undefined}
              className={cn(
                "flex size-10 items-center justify-center rounded-full text-xs font-bold transition",
                item === page
                  ? "bg-gradient-to-r from-brand to-brand-light text-white shadow-[0_8px_24px_-10px_rgba(128,0,255,0.9)]"
                  : "border border-white/10 text-ash hover:border-brand-light/40 hover:text-fog",
              )}
            >
              {item}
            </Link>
          </span>
        );
      })}

      {page < totalPages ? (
        <Link
          href={buildHref(page + 1)}
          aria-label="Próxima página"
          className="flex size-10 items-center justify-center rounded-full border border-white/10 text-ash transition hover:border-brand-light/40 hover:text-fog"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-full border border-white/5 text-ash/30"
        >
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
