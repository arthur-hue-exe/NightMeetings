import type { Metadata } from "next";
import Link from "next/link";
import { Instagram, MapPin, Plus, ShieldCheck, Users } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { INSTAGRAM_URL, SITE_DESCRIPTION } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Sobre o MotorMeetings",
  description:
    "Conheça o MotorMeetings, a plataforma independente que reúne encontros de moto em Goiânia, Aparecida de Goiânia e região metropolitana.",
  alternates: { canonical: "/sobre" },
};

const values = [
  {
    icon: MapPin,
    title: "Feito para a região",
    text: "Goiânia, Aparecida e cidades do entorno. Cidades e categorias refletem os encontros reais publicados na plataforma.",
  },
  {
    icon: Users,
    title: "Comunidade em primeiro lugar",
    text: "Cada organizador tem um perfil público com o nome e os eventos ativos. Sem ranking inventado, sem número de participantes fabricado.",
  },
  {
    icon: ShieldCheck,
    title: "Informação confiável",
    text: "Datas, horários e locais vêm do organizador. A plataforma valida os campos, mas não cria rotas, distâncias ou tempos de viagem.",
  },
];

export default function AboutPage() {
  return (
    <div className="pb-16 pt-28 lg:pt-32">
      <div className="shell">
        <nav aria-label="Trilha de navegação" className="text-[0.7rem] uppercase tracking-[0.18em] text-ash/70">
          <Link href="/" className="transition hover:text-fog">
            Início
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <span className="text-ash">Sobre</span>
        </nav>

        <header className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="eyebrow">A plataforma</p>
            <h1 className="display mt-3 text-5xl leading-[0.92] text-fog sm:text-6xl lg:text-7xl">
              Motos, encontros e <span className="text-gradient">estrada</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-relaxed text-ash sm:text-base">
              {SITE_DESCRIPTION} O MotorMeetings nasceu para dar um lugar claro e organizado aos
              encontros que já acontecem nas praças, postos e estradas de Goiás — e para quem está
              chegando agora encontrar a galera certa.
            </p>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ash">
              É um projeto independente, feito para a comunidade motociclista. A publicação é
              gratuita e cada evento tem uma página pública com link próprio para compartilhar no
              grupo, no story ou onde a galera combinar.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <ButtonLink href="/eventos" size="md">
                Explorar eventos
              </ButtonLink>
              <ButtonLink href="/eventos/criar" variant="secondary" size="md">
                <Plus className="size-4" aria-hidden="true" />
                Publicar evento
              </ButtonLink>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-night-2/70 p-6 sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-brand/20 blur-[80px]"
            />
            <p className="relative font-display text-3xl leading-tight tracking-wide text-fog">
              “Seu próximo rolê começa aqui.”
            </p>
            <p className="relative mt-4 text-sm leading-relaxed text-ash">
              A frase que abre a home é o resumo da ideia: descobrir um encontro, confirmar os
              detalhes e sair de casa com a galera. O resto é estrada.
            </p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="relative mt-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-ash transition hover:border-brand-light/40 hover:text-fog"
            >
              <Instagram className="size-4" aria-hidden="true" />
              Acompanhar no Instagram
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </div>
        </header>

        <Reveal className="mt-12 grid gap-4 md:grid-cols-3">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <div key={value.title} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
                <span className="flex size-10 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-light">
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <h2 className="display mt-4 text-2xl tracking-wide text-fog">{value.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ash">{value.text}</p>
              </div>
            );
          })}
        </Reveal>

        <section className="mt-12 max-w-3xl" aria-labelledby="about-does">
          <h2 id="about-does" className="display text-3xl text-fog sm:text-4xl">
            O que você encontra por aqui
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-ash">
            <p>
              Um catálogo com busca por nome, local ou cidade; filtros de cidade, categoria, período,
              data específica e eventos com rota; ordenação por data mais próxima ou por publicação
              recente. Eventos passados saem do catálogo automaticamente no dia seguinte ao
              encerramento.
            </p>
            <p>
              Cada evento mostra concentração, horário, cidade, rota quando cadastrada, galeria de
              fotos, regras e um link direto para o Google Maps com o endereço informado. Também é
              possível compartilhar a página pela API do navegador ou copiar o link.
            </p>
            <p>
              Organizadores contam com uma área para acompanhar, editar, cancelar e excluir os
              próprios eventos. A autorização é verificada no servidor: ninguém edita o evento de
              outra pessoa informando um ID.
            </p>
          </div>
        </section>

        <div className="mt-12 rounded-[1.8rem] border border-white/8 bg-night-2/60 p-6 sm:p-8">
          <h2 className="display text-2xl tracking-wide text-fog">Transparência desde o início</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ash">
            Não exibimos e-mails, senhas ou dados privados. Não publicamos feed falso, avaliações
            inventadas ou contadores de popularidade. Quando uma informação não foi cadastrada pelo
            organizador, ela simplesmente não aparece. Dúvidas, correções e sugestões podem ser
            enviadas pelo Instagram oficial.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-brand-light">
            <Link href="/como-funciona" className="underline-offset-4 hover:underline">
              Como funciona
            </Link>
            <Link href="/privacidade" className="underline-offset-4 hover:underline">
              Política de privacidade
            </Link>
            <Link href="/termos" className="underline-offset-4 hover:underline">
              Termos de uso
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
