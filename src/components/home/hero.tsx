"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Plus, Route } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ButtonLink } from "@/components/ui/button";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function Hero({
  activeCount,
  cityCount,
}: {
  activeCount: number;
  cityCount: number;
}) {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const content = contentRef.current;
    const image = imageRef.current;
    if (!section || !content || !image) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      const items = content.querySelectorAll("[data-hero-item]");
      gsap.fromTo(
        items,
        { y: 26, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.11, delay: 0.15 },
      );

      gsap.fromTo(
        image,
        { scale: 1.12, opacity: 0.35 },
        { scale: 1, opacity: 1, duration: 1.8, ease: "power2.out" },
      );

      ScrollTrigger.matchMedia({
        "(min-width: 1024px)": () => {
          gsap.to(image, {
            yPercent: 9,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex min-h-[40rem] items-center overflow-hidden pb-16 pt-28 sm:min-h-[44rem] lg:min-h-[47rem] lg:pb-24 lg:pt-32"
      aria-labelledby="hero-title"
    >
      <div ref={imageRef} className="absolute inset-0 -z-20">
        <Image
          src="/images/hero-night.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[68%_center] opacity-90 lg:object-center"
        />
      </div>
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-night via-night/88 to-night/20" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-transparent to-night/55" />
      <div
        aria-hidden="true"
        className="absolute -left-24 top-1/3 -z-10 size-72 rounded-full bg-brand/20 blur-[110px] sm:size-96"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-6rem] top-24 -z-10 hidden size-[26rem] opacity-[0.07] lg:block"
      >
        <Image src="/images/logo-mark.png" alt="" fill sizes="26rem" className="object-contain" />
      </div>

      <div ref={contentRef} className="shell relative z-10 w-full">
        <div className="max-w-3xl">
          <p data-hero-item className="eyebrow">
            Goiânia • Aparecida • Região metropolitana
          </p>

          <h1
            data-hero-item
            id="hero-title"
            className="display mt-5 text-[clamp(3.25rem,9.2vw,7rem)] text-fog"
          >
            Seu próximo <span className="text-gradient">rolê</span>
            <br />
            começa aqui.
          </h1>

          <p data-hero-item className="mt-6 max-w-xl text-sm leading-relaxed text-ash sm:text-base">
            Encontre a galera, descubra encontros de motos e organize seu próximo destino
            em Goiânia e região.
          </p>

          <div data-hero-item className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <ButtonLink href="/eventos" size="lg" className="group w-full sm:w-auto">
              Explorar eventos
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/eventos/criar" variant="secondary" size="lg" className="w-full sm:w-auto">
              <Plus className="size-4" aria-hidden="true" />
              Criar meu evento
            </ButtonLink>
          </div>

          <dl
            data-hero-item
            className="mt-10 grid grid-cols-3 gap-x-3 gap-y-2 border-t border-white/10 pt-6 sm:flex sm:flex-wrap sm:items-center sm:gap-x-8"
          >
            <div>
              <dt className="text-[0.55rem] font-bold uppercase tracking-[0.16em] text-ash sm:text-[0.62rem] sm:tracking-[0.2em]">
                Encontros ativos
              </dt>
              <dd className="mt-1 font-display text-2xl leading-none text-fog sm:text-3xl">
                {activeCount.toString().padStart(2, "0")}
              </dd>
            </div>
            <span aria-hidden="true" className="hidden h-8 w-px bg-white/10 sm:block" />
            <div>
              <dt className="text-[0.55rem] font-bold uppercase tracking-[0.16em] text-ash sm:text-[0.62rem] sm:tracking-[0.2em]">
                Cidades na região
              </dt>
              <dd className="mt-1 font-display text-2xl leading-none text-fog sm:text-3xl">
                {cityCount.toString().padStart(2, "0")}
              </dd>
            </div>
            <span aria-hidden="true" className="hidden h-8 w-px bg-white/10 sm:block" />
            <div>
              <dt className="text-[0.55rem] font-bold uppercase tracking-[0.16em] text-ash sm:text-[0.62rem] sm:tracking-[0.2em]">
                Roteiros
              </dt>
              <dd className="mt-1 inline-flex items-center gap-1.5 whitespace-nowrap font-display text-2xl leading-none text-fog sm:text-3xl">
                <Route className="size-4 text-brand-light sm:size-5" aria-hidden="true" /> Com rota
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <Link
        href="#proximos"
        className="absolute bottom-6 right-6 z-10 hidden items-center gap-2 text-[0.62rem] font-bold uppercase tracking-[0.2em] text-ash transition hover:text-fog lg:inline-flex"
      >
        Role para explorar
        <span className="flex size-8 items-center justify-center rounded-full border border-white/15">
          <ArrowDown className="size-3.5" aria-hidden="true" />
        </span>
      </Link>
    </section>
  );
}
