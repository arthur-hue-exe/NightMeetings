import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, ShieldAlert, ShieldCheck, UsersRound } from "lucide-react";
import { EventImage } from "@/components/events/event-image";
import {
  CommunityManageActions,
  CommunityReportButton,
} from "@/components/community/community-actions";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { getCommunityBySlug } from "@/lib/community";
import { getCommunityCategory } from "@/lib/constants";
import { isWhatsAppInviteUrl } from "@/lib/validation";

type Params = { params: Promise<{ slug: string }> };

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const community = await getCommunityBySlug(slug, true);
  if (!community) return { title: "Comunidade não encontrada" };

  return {
    title: community.name,
    description:
      community.description ??
      `Comunidade de motociclistas ${community.city ? `em ${community.city}` : "na região"} com convite oficial no WhatsApp.`,
    alternates: { canonical: `/comunidade/${community.slug}` },
    robots:
      community.status === "ACTIVE"
        ? { index: true, follow: true }
        : { index: false, follow: false },
    openGraph: {
      title: `${community.name} | MotorMeetings`,
      description: community.description ?? "Comunidade de motociclistas no MotorMeetings.",
      images: [{ url: community.emblemUrl, alt: `Emblema de ${community.name}` }],
    },
  };
}

export default async function CommunityDetailPage({ params }: Params) {
  const { slug } = await params;
  const community = await getCommunityBySlug(slug, true);
  if (!community) notFound();

  const user = await getCurrentUser();
  const isOwner = user?.id === community.creatorId;
  const isAdmin = user?.role === "ADMIN";
  const canManage = Boolean(isOwner || isAdmin);
  const isActive = community.status === "ACTIVE";

  if (!isActive && !canManage) notFound();

  const categoryLabel = getCommunityCategory(community.category)?.label ?? "Outros";
  const canOpenWhatsApp = isActive && isWhatsAppInviteUrl(community.whatsappInviteUrl);
  const createdAt = dateFormatter.format(community.createdAt);

  return (
    <div className="pb-10 pt-28 lg:pt-32">
      <div className="shell">
        <nav aria-label="Trilha de navegação" className="text-[0.7rem] uppercase tracking-[0.18em] text-ash/70">
          <Link href="/" className="transition hover:text-fog">
            Início
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <Link href="/comunidade?aba=grupos" className="transition hover:text-fog">
            Comunidade
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <span className="text-ash">{community.name}</span>
        </nav>

        {!isActive ? (
          <p className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
            Esta comunidade está desativada e não aparece nas listagens públicas. Você a vê porque é
            proprietário ou administrador.
          </p>
        ) : null}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_21rem]">
          <article className="panel overflow-hidden rounded-4xl">
            <div
              aria-hidden="true"
              className="h-32 bg-[radial-gradient(120%_100%_at_20%_0%,rgba(128,0,255,0.35),transparent_65%)] sm:h-40"
            />
            <div className="px-5 pb-6 sm:px-8">
              <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
                <span className="relative size-24 shrink-0 overflow-hidden rounded-3xl border-4 border-night-2 bg-night-3 shadow-2xl sm:size-28">
                  <EventImage
                    src={community.emblemUrl}
                    alt={`Emblema de ${community.name}`}
                    fill
                    sizes="112px"
                    priority
                    className="object-cover"
                  />
                </span>
                <div className="pb-1">
                  <Badge tone="brand">{categoryLabel}</Badge>
                </div>
              </div>

              <h1 className="display mt-5 text-4xl leading-[0.95] text-fog sm:text-5xl">
                {community.name}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ash">
                {community.city ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-brand-light" aria-hidden="true" />
                    {community.city}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1.5">
                  <UsersRound className="size-3.5 text-brand-light" aria-hidden="true" />
                  Organizado por{" "}
                  <Link
                    href={`/organizadores/${community.creator.id}`}
                    className="font-semibold text-fog hover:text-brand-light"
                  >
                    {community.creator.name}
                  </Link>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 text-brand-light" aria-hidden="true" />
                  Publicada em {createdAt}
                </span>
              </div>

              <div className="mt-6 space-y-4 text-sm leading-relaxed text-fog/90">
                {community.description ? (
                  <p className="whitespace-pre-line">{community.description}</p>
                ) : (
                  <p className="text-ash">
                    Esta comunidade ainda não adicionou uma descrição. Use o convite oficial ao lado
                    para conhecer o grupo no WhatsApp.
                  </p>
                )}
              </div>

              <div className="mt-8 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-ash">Convite do grupo</p>
                {canOpenWhatsApp ? (
                  <a
                    href={community.whatsappInviteUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 px-5 py-2.5 text-sm font-bold text-emerald-950 transition hover:brightness-110"
                  >
                    Entrar no grupo do WhatsApp
                    <span className="sr-only">(abre em nova aba)</span>
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-ash">
                    O botão do WhatsApp está indisponível enquanto a comunidade estiver desativada.
                  </p>
                )}

                <p className="mt-4 flex items-start gap-2 text-[0.7rem] leading-relaxed text-ash">
                  <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300" aria-hidden="true" />
                  Você será direcionado ao WhatsApp, um serviço externo. O MotorMeetings não controla
                  o conteúdo, as regras ou a administração do grupo. Confirme o convite antes de entrar
                  e nunca compartilhe dados sensíveis ou códigos de verificação.
                </p>
              </div>
            </div>
          </article>

          <aside className="space-y-4">
            <div className="panel rounded-3xl p-5">
              <h2 className="text-sm font-bold text-fog">Informações</h2>
              <dl className="mt-3 space-y-3 text-xs">
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-ash/70">Categoria</dt>
                  <dd className="mt-0.5 text-fog">{categoryLabel}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-ash/70">Cidade ou região</dt>
                  <dd className="mt-0.5 text-fog">{community.city || "Não informada"}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-ash/70">Organizador</dt>
                  <dd className="mt-0.5 text-fog">{community.creator.name}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-ash/70">Status</dt>
                  <dd className="mt-0.5 text-fog">{isActive ? "Ativa" : "Desativada"}</dd>
                </div>
              </dl>
              <p className="mt-4 flex items-start gap-1.5 text-[0.66rem] leading-relaxed text-ash/70">
                <ShieldCheck className="mt-0.5 size-3 shrink-0 text-brand-light" aria-hidden="true" />
                Não exibimos contagem de membros nem níveis de atividade, pois esses dados não são verificados.
              </p>
            </div>

            {canManage ? (
              <CommunityManageActions communityId={community.id} slug={community.slug} status={community.status} />
            ) : null}

            {user?.id !== community.creatorId ? (
              <div className="panel rounded-2xl p-4">
                <h2 className="text-xs font-bold uppercase tracking-wide text-ash">Segurança</h2>
                <p className="mt-2 text-[0.68rem] leading-relaxed text-ash">
                  Encontrou algo errado? Denuncie para a moderação revisar a comunidade.
                </p>
                <div className="mt-3">
                  <CommunityReportButton communityId={community.id} />
                </div>
              </div>
            ) : null}
          </aside>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/comunidade?aba=grupos"
            className="text-xs font-semibold text-ash transition hover:text-fog"
          >
            ← Voltar para os grupos
          </Link>
          <Link
            href="/comunidade?aba=forum"
            className="text-xs font-semibold text-brand-light transition hover:text-fog"
          >
            Conversar no fórum global →
          </Link>
        </div>
      </div>
    </div>
  );
}
