import type { Metadata } from "next";
import Link from "next/link";
import {
  CalendarClock,
  CheckCircle2,
  Flag,
  MapPin,
  Navigation,
  Plus,
  Route,
  ShieldCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Como funciona",
  description:
    "Entenda como publicar, encontrar e acompanhar encontros de moto no MotorMeetings: cadastro, formulário em etapas, rota opcional e a regra automática de expiração dos eventos.",
  alternates: { canonical: "/como-funciona" },
};

const steps = [
  {
    icon: UserPlus,
    title: "Crie sua conta",
    text: "Escolha um nome público, informe seu e-mail e defina uma senha. Seu e-mail e sua senha nunca aparecem no perfil público — apenas o nome do organizador.",
  },
  {
    icon: Plus,
    title: "Monte o evento",
    text: "Preencha data, horário, cidade e ponto de encontro. Descrição, fotos, rota, regras e Instagram são opcionais. O formulário valida cada etapa antes de publicar.",
  },
  {
    icon: Route,
    title: "Publique e compartilhe",
    text: "Revise o resumo, publique e receba um link público no formato /eventos/nome-do-evento. Compartilhe pela API de compartilhamento do navegador ou copie o link.",
  },
];

const organizerChecklist = [
  "Data e horário reais do encontro",
  "Ponto de encontro com referência clara",
  "Saída e chegada separadas do encontro, quando houver rota",
  "Regras, informações extras e contato público (opcional)",
  "Fotos próprias ou com autorização de uso",
];

export default function HowItWorksPage() {
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
          <span className="text-ash">Como funciona</span>
        </nav>

        <header className="mt-5 max-w-3xl">
          <p className="eyebrow">Do cadastro ao rolê</p>
          <h1 className="display mt-3 text-5xl leading-[0.92] text-fog sm:text-6xl lg:text-7xl">
            Como <span className="text-gradient">funciona</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ash sm:text-base">
            O MotorMeetings conecta organizadores e motociclistas de Goiânia, Aparecida e região.
            Publicar é gratuito, e cada evento tem uma página pública própria — com data, local,
            rota opcional e as informações que o organizador cadastrar.
          </p>
        </header>

        <Reveal className="mt-9 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="panel relative overflow-hidden rounded-3xl p-6">
                <span className="absolute right-5 top-4 font-display text-5xl leading-none text-white/6">
                  0{index + 1}
                </span>
                <span className="flex size-11 items-center justify-center rounded-xl border border-brand/30 bg-brand/10 text-brand-light">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h2 className="display mt-4 text-2xl tracking-wide text-fog">{step.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ash">{step.text}</p>
              </div>
            );
          })}
        </Reveal>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]" aria-labelledby="timeline-title">
          <div className="panel rounded-[1.8rem] p-6 sm:p-8">
            <p className="eyebrow">Leitura da rota</p>
            <h2 id="timeline-title" className="display mt-2 text-3xl text-fog">
              Encontro não é saída
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-ash">
              Todo evento tem um ponto de encontro e um horário de início. Quando o organizador
              cadastra uma rota, aparecem também a saída e a chegada — cada uma com seu próprio
              horário. A linha do tempo deixa claro o que acontece primeiro.
            </p>

            <ol className="mt-6 space-y-5 border-l border-white/10 pl-5">
              <li className="relative">
                <span className="absolute -left-[1.72rem] top-0.5 flex size-4 items-center justify-center rounded-full border border-brand/50 bg-brand/20">
                  <MapPin className="size-2.5 text-brand-light" aria-hidden="true" />
                </span>
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-ash">
                  Concentração
                </p>
                <p className="mt-0.5 text-sm text-fog">
                  Onde a galera se reúne. É o ponto principal exibido no card e usado nos links do
                  Google Maps.
                </p>
              </li>
              <li className="relative">
                <span className="absolute -left-[1.72rem] top-0.5 flex size-4 items-center justify-center rounded-full border border-white/20 bg-night-3">
                  <Navigation className="size-2.5 text-fog" aria-hidden="true" />
                </span>
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-ash">
                  Saída
                </p>
                <p className="mt-0.5 text-sm text-fog">
                  Quando o comboio realmente parte. Pode ser no mesmo ponto do encontro ou em outro
                  local informado pelo organizador.
                </p>
              </li>
              <li className="relative">
                <span className="absolute -left-[1.72rem] top-0.5 flex size-4 items-center justify-center rounded-full border border-white/20 bg-night-3">
                  <Flag className="size-2.5 text-fog" aria-hidden="true" />
                </span>
                <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-ash">
                  Chegada
                </p>
                <p className="mt-0.5 text-sm text-fog">
                  Destino final. Se cair no dia seguinte, a página avisa com destaque e mostra a data
                  correta.
                </p>
              </li>
            </ol>

            <p className="mt-6 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3.5 text-xs leading-relaxed text-ash">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-light" aria-hidden="true" />
              O MotorMeetings não calcula distâncias, coordenadas ou tempos de viagem. Os links do
              mapa usam apenas os endereços informados pelo organizador.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-brand/25 bg-brand/[0.07] p-5">
              <p className="flex items-center gap-2 text-sm font-bold text-fog">
                <CalendarClock className="size-4 text-brand-light" aria-hidden="true" />
                Regra de expiração
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ash">
                O evento continua visível até o fim do dia da data final. No dia seguinte, sai
                automaticamente do catálogo, da busca e dos perfis públicos. Eventos com data final
                cadastrada (dois ou mais dias) seguem a data final.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ash/80">
                A regra roda no servidor, com o fuso de America/Sao_Paulo, e não depende do relógio
                do navegador. Os registros continuam preservados no histórico do organizador.
              </p>
              <div className="mt-3">
                <Badge tone="brand">Regra automática</Badge>
              </div>
            </div>

            <div className="rounded-2xl border border-white/8 bg-night-2/70 p-5">
              <p className="text-sm font-bold text-fog">O organizador informa</p>
              <ul className="mt-3 space-y-2">
                {organizerChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs leading-relaxed text-ash">
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-[1.8rem] border border-white/8 bg-white/[0.025] p-6 sm:p-8" aria-labelledby="limits-title">
          <p className="eyebrow">Transparência</p>
          <h2 id="limits-title" className="display mt-2 text-3xl text-fog">
            O que não fazemos
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              "Não intermediamos pagamentos, inscrições ou reservas.",
              "Não inventamos popularidade, número de participantes ou distâncias.",
              "Não garantimos a presença de organizadores ou participantes.",
              "Não exibimos e-mail, senha ou dados privados no perfil público.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 rounded-xl border border-white/8 bg-night-2/60 p-3.5 text-xs leading-relaxed text-ash">
                <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-300" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-ash/80">
            As informações do evento são de responsabilidade do organizador. Confirme sempre data,
            horário e local antes de sair de casa.
          </p>
        </section>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 rounded-[1.8rem] border border-brand/25 bg-gradient-to-r from-brand/[0.12] to-transparent p-6 sm:flex-row sm:items-center">
          <div>
            <p className="display text-2xl tracking-wide text-fog">Pronto para publicar o próximo rolê?</p>
            <p className="mt-1 text-sm text-ash">Crie sua conta e monte o evento em poucos minutos.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/eventos" variant="secondary" size="md">
              Explorar eventos
            </ButtonLink>
            <ButtonLink href="/eventos/criar" size="md">
              <Plus className="size-4" aria-hidden="true" />
              Criar meu evento
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
