import type { Metadata } from "next";
import { ArrowLeft, CalendarSearch } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Página não encontrada",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="relative overflow-hidden pb-20 pt-32 lg:pt-40">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-10 size-[36rem] -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]"
      />
      <div className="shell relative">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <Logo size="lg" />
          <p className="mt-8 font-display text-[7rem] leading-none tracking-tight text-white/8 sm:text-[10rem]">
            404
          </p>
          <h1 className="display -mt-6 text-4xl leading-none text-fog sm:text-5xl">
            Esse rolê não existe
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-ash">
            A página pode ter sido removida, o endereço pode estar incorreto ou o evento já saiu do
            ar após o encerramento. Confira o catálogo para encontrar os próximos encontros.
          </p>
          <div className="mt-7 flex flex-col gap-2.5 sm:flex-row">
            <ButtonLink href="/eventos" size="lg">
              <CalendarSearch className="size-4" aria-hidden="true" />
              Explorar eventos
            </ButtonLink>
            <ButtonLink href="/" variant="secondary" size="lg">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Voltar para o início
            </ButtonLink>
          </div>
          <p className="mt-8 text-[0.7rem] uppercase tracking-[0.2em] text-ash/60">
            Goiânia • Aparecida • Região
          </p>
        </div>
      </div>
    </div>
  );
}
