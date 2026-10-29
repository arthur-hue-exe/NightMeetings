import Image from "next/image";
import { ArrowRight, Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export function PublishCTA({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <section className="shell pb-4 pt-16 sm:pt-20">
      <div className="relative overflow-hidden rounded-[2rem] border border-brand/25 bg-gradient-to-br from-brand-dark/55 via-night-2 to-night p-7 sm:p-11 lg:p-14">
        <div aria-hidden="true" className="absolute -right-16 -top-24 size-80 rounded-full bg-brand/20 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-16 right-4 hidden h-64 w-64 opacity-[0.12] sm:block">
          <Image src="/images/logo-mark.png" alt="" fill sizes="256px" className="object-contain" />
        </div>

        <div className="relative max-w-2xl">
          <p className="eyebrow">Sua vez</p>
          <h2 className="display mt-3 text-4xl leading-[0.95] text-fog sm:text-5xl lg:text-6xl">
            Bora marcar o <span className="text-gradient">próximo rolê?</span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ash sm:text-base">
            Crie o encontro, defina o ponto de concentração, o roteiro e a galera.
            Em poucos minutos seu evento está no ar com link próprio para compartilhar.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/eventos/criar" size="lg" className="group">
              <Plus className="size-4" aria-hidden="true" />
              Publicar evento
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </ButtonLink>
            {!isAuthenticated ? (
              <ButtonLink href="/cadastrar" variant="secondary" size="lg">
                Criar minha conta
              </ButtonLink>
            ) : (
              <ButtonLink href="/meus-eventos" variant="secondary" size="lg">
                Ver meus eventos
              </ButtonLink>
            )}
          </div>
          <p className="mt-4 text-xs text-ash/75">Publicar é gratuito. Você mantém o controle do seu evento.</p>
        </div>
      </div>
    </section>
  );
}
