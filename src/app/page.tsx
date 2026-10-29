import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { EventCard } from "@/components/events/event-card";
import { RouteRideCard } from "@/components/home/route-ride-card";
import { CategoryTile } from "@/components/home/category-tile";
import { RecentEvents } from "@/components/home/recent-events";
import { PublishCTA } from "@/components/home/publish-cta";
import { SectionHeading } from "@/components/events/section-heading";
import { EmptyState } from "@/components/events/empty-state";
import { Reveal } from "@/components/motion/reveal";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAttendingEventIds, getHomeData } from "@/lib/events";
import { getCurrentUser } from "@/lib/auth";
import { EVENT_CATEGORIES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "MotorMeetings — Encontros de motos em Goiânia e região",
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [data, user] = await Promise.all([getHomeData(), getCurrentUser()]);
  const attendingIds = user
    ? await getAttendingEventIds(user.id, [
        ...new Set([...data.upcoming, ...data.featured, ...data.routeRides].map((event) => event.id)),
      ])
    : new Set<string>();

  return (
    <>
      <Hero activeCount={data.activeCount} cityCount={data.cityCount} />

      <section id="proximos" className="shell scroll-mt-24 py-16 sm:py-20 lg:py-24">
        <Reveal stagger={false}>
          <SectionHeading
            eyebrow="Agenda da região"
            title={
              <>
                Próximos <span className="text-gradient">encontros</span>
              </>
            }
            description="Os próximos rolês confirmados em Goiânia, Aparecida e região metropolitana. Tudo com data, horário e ponto de encontro reais."
            href="/eventos"
            linkLabel="Ver catálogo completo"
          />
        </Reveal>

        {data.upcoming.length > 0 ? (
          <Reveal className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.upcoming.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                priority={index < 3}
                attending={attendingIds.has(event.id)}
                authenticated={Boolean(user)}
              />
            ))}
          </Reveal>
        ) : (
          <div className="mt-10">
            <EmptyState
              icon={CalendarClock}
              title="Nenhum encontro na agenda ainda"
              description="Ainda não há eventos ativos publicados. Seja o primeiro a organizar um encontro na região."
              action={
                <ButtonLink href="/eventos/criar" size="md">
                  Criar o primeiro evento
                </ButtonLink>
              }
            />
          </div>
        )}
      </section>

      {data.featured.length > 0 ? (
        <section className="relative border-y border-white/6 bg-night-2/40 py-16 sm:py-20 lg:py-24">
          <div className="shell">
            <Reveal stagger={false}>
              <SectionHeading
                eyebrow="Curadoria MotorMeetings"
                title={
                  <>
                    Eventos em <span className="text-gradient">destaque</span>
                  </>
                }
                description="Selecionados pela organização da plataforma por relevância para a comunidade. Destaques são definidos no painel administrativo, sem métricas inventadas."
                href="/eventos?sort=recent"
                linkLabel="Ver recentes"
              />
            </Reveal>
            <Reveal className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {data.featured.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  attending={attendingIds.has(event.id)}
                  authenticated={Boolean(user)}
                />
              ))}
            </Reveal>
          </div>
        </section>
      ) : null}

      {data.routeRides.length > 0 ? (
        <section className="shell py-16 sm:py-20 lg:py-24">
          <Reveal stagger={false}>
            <SectionHeading
              eyebrow="Com rota definida"
              title={
                <>
                  Próximos <span className="text-gradient">rolês</span>
                </>
              }
              description="Concentração, saída e destino organizados. Abra os pontos no mapa e planeje sua chegada."
              href="/eventos?withRoute=1"
              linkLabel="Só eventos com rota"
            />
          </Reveal>
          <Reveal className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.routeRides.map((event) => (
              <RouteRideCard
                key={event.id}
                event={event}
                attending={attendingIds.has(event.id)}
                authenticated={Boolean(user)}
              />
            ))}
          </Reveal>
        </section>
      ) : null}

      <section className="relative overflow-hidden border-y border-white/6 bg-night-2/30 py-16 sm:py-20 lg:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-brand/50 to-transparent"
        />
        <div className="shell">
          <Reveal stagger={false}>
            <SectionHeading
              eyebrow="Categorias"
              title={
                <>
                  Encontre seu <span className="text-gradient">tipo de rolê</span>
                </>
              }
              description="Do encontro no posto ao passeio de estrada. Filtre por categoria e descubra a galera que combina com a sua moto."
            />
          </Reveal>
          <Reveal className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4" stagger>
            {EVENT_CATEGORIES.map((category) => (
              <CategoryTile
                key={category.value}
                category={category}
                count={data.categoryCounts[category.value] ?? 0}
              />
            ))}
          </Reveal>
        </div>
      </section>

      {data.recent.length > 0 ? (
        <section className="shell py-16 sm:py-20 lg:py-24">
          <Reveal stagger={false}>
            <SectionHeading
              eyebrow="Acabou de chegar"
              title={
                <>
                  Publicados <span className="text-gradient">recentemente</span>
                </>
              }
              description="Os últimos eventos adicionados pela comunidade."
              href="/eventos?sort=recent"
              linkLabel="Ver todos os recentes"
            />
          </Reveal>
          <Reveal className="mt-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <RecentEvents events={data.recent} />
            <div className="flex flex-col justify-between gap-6 rounded-3xl border border-white/8 bg-gradient-to-br from-night-2 to-night p-6 sm:p-8">
              <div>
                <Badge tone="brand">Comunidade</Badge>
                <h3 className="display mt-4 text-3xl leading-none text-fog sm:text-4xl">
                  O rolê só acontece quando a galera aparece.
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ash">
                  Cada encontro publicado ajuda a comunidade a se encontrar. Divulgue o seu,
                  compartilhe o link e reúna quem vive sobre duas rodas.
                </p>
              </div>
              <ButtonLink href={user ? "/eventos/criar" : "/cadastrar"} size="md" variant="outline" className="self-start">
                {user ? "Publicar um evento" : "Entrar na comunidade"}
              </ButtonLink>
            </div>
          </Reveal>
        </section>
      ) : null}

      <PublishCTA isAuthenticated={Boolean(user)} />
    </>
  );
}
