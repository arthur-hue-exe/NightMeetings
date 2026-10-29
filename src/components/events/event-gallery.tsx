"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react";
import { EventImage } from "@/components/events/event-image";
import { cn } from "@/lib/utils";

export type GalleryImage = { url: string; alt: string };

export function EventGallery({
  images,
  title,
}: {
  images: GalleryImage[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setActiveIndex(null);
    triggerRef.current?.focus();
  }, []);

  const next = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? null : (current + 1) % images.length,
    );
  }, [images.length]);

  const previous = useCallback(() => {
    setActiveIndex((current) =>
      current === null ? null : (current - 1 + images.length) % images.length,
    );
  }, [images.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, close, next, previous]);

  if (images.length === 0) return null;

  const active = activeIndex !== null ? images[activeIndex] : null;

  return (
    <>
      <div className={cn("grid gap-2.5", images.length > 1 ? "grid-cols-4" : "grid-cols-1")}>
        {images.map((image, index) => (
          <button
            key={image.url}
            type="button"
            onClick={(event) => {
              triggerRef.current = event.currentTarget;
              setActiveIndex(index);
            }}
            aria-label={`Ampliar imagem ${index + 1} de ${images.length}`}
            className={cn(
              "group relative overflow-hidden rounded-2xl border border-white/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-light",
              images.length > 1 && index === 0 ? "col-span-4 aspect-16/9" : "",
              images.length > 1 && index > 0 ? "col-span-2 aspect-square sm:aspect-4/3" : "",
              images.length === 1 ? "aspect-16/9" : "",
            )}
          >
            <EventImage
              src={image.url}
              alt={image.alt}
              fill
              sizes={index === 0 ? "(max-width: 1024px) 100vw, 60vw" : "(max-width: 640px) 50vw, 25vw"}
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-night/45 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            {index === 0 && images.length > 1 ? (
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-night/70 px-2.5 py-1 text-[0.65rem] font-semibold text-fog backdrop-blur">
                <ImageIcon className="size-3" aria-hidden="true" /> {images.length} fotos
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {active ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Galeria de fotos — ${title}`}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-night/95 p-4 backdrop-blur-xl"
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            aria-label="Fechar galeria"
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-fog transition hover:bg-white/[0.12]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>

          <p className="absolute left-4 top-5 text-xs font-semibold uppercase tracking-[0.18em] text-ash">
            {activeIndex !== null ? `${activeIndex + 1} / ${images.length}` : ""}
          </p>

          <div className="relative h-[72svh] w-full max-w-5xl">
            <EventImage
              src={active.url}
              alt={active.alt}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={previous}
                aria-label="Imagem anterior"
                className="absolute left-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-night/70 text-fog transition hover:bg-white/[0.12] sm:left-6"
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Próxima imagem"
                className="absolute right-3 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-night/70 text-fog transition hover:bg-white/[0.12] sm:right-6"
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </button>
            </>
          ) : null}

          <p className="absolute bottom-5 left-1/2 max-w-xl -translate-x-1/2 text-center text-xs text-ash">
            {active.alt}
          </p>
        </div>
      ) : null}
    </>
  );
}
