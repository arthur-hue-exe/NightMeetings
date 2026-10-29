import type { Metadata } from "next";
import Link from "next/link";
import {
  LockKeyhole,
  MessageSquareText,
  MessagesSquare,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import { CommunityDirectory } from "@/components/community/community-directory";
import { Forum } from "@/components/community/forum";
import { Messenger } from "@/components/community/messenger";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { getAnonymousSession } from "@/lib/anonymous";
import { listCommunities, getPublicCommunityCities } from "@/lib/community";
import { getForumMessages } from "@/lib/forum";
import { prisma } from "@/lib/db";
import { COMMUNITY_CATEGORY_VALUES, MAX_COMMUNITY_PAGE_SIZE } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Comunidade",
  description:
    "Grupos de motociclistas com convite oficial no WhatsApp, fórum global em tempo real e mensagens privadas no MotorMeetings.",
  alternates: { canonical: "/comunidade" },
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const TABS = [
  { value: "grupos", label: "Grupos", icon: UsersRound },
  { value: "forum", label: "Fórum global", icon: MessagesSquare },
  { value: "mensagens", label: "Mensagens", icon: LockKeyhole },
] as const;

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const tabRaw = first(params.aba);
  const tab = TABS.some((item) => item.value === tabRaw) ? (tabRaw as (typeof TABS)[number]["value"]) : "grupos";

  const user = await getCurrentUser();
  const activeCount = await prisma.community.count({ where: { status: "ACTIVE" } });

  const q = first(params.q)?.trim().slice(0, 80) ?? "";
  const categoryRaw = first(params.category)?.trim() ?? "";
  const category = (COMMUNITY_CATEGORY_VALUES as readonly string[]).includes(categoryRaw)
    ? categoryRaw
    : "";
  const city = first(params.city)?.trim().slice(0, 60) ?? "";

  const groupsData =
    tab === "grupos"
      ? await Promise.all([
          listCommunities({ q, category, city, limit: MAX_COMMUNITY_PAGE_SIZE - 3, offset: 0 }),
          getPublicCommunityCities(),
        ])
      : null;

  const forumData =
    tab === "forum"
      ? await Promise.all([getForumMessages({}), user ? Promise.resolve(null) : getAnonymousSession()])
      : null;

  function tabHref(value: string) {
    const search = new URLSearchParams();
    search.set("aba", value);
    if (value === "mensagens" && first(params.c)) search.set("c", first(params.c)!);
    return `/comunidade?${search.toString()}`;
  }

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
          <span className="text-ash">Comunidade</span>
        </nav>

        <header className="mt-5 max-w-3xl">
          <p className="eyebrow">Comunidade MotorMeetings</p>
          <h1 className="display mt-3 text-5xl leading-[0.92] text-fog sm:text-6xl lg:text-7xl">
            Encontre sua <span className="text-gradient">galera</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ash sm:text-base">
            Grupos com convite oficial no WhatsApp, um fórum global aberto a visitantes e mensagens
            privadas entre membros. {activeCount} {activeCount === 1 ? "grupo ativo" : "grupos ativos"} publicados.
          </p>
        </header>

        <nav
          aria-label="Áreas da comunidade"
          className="mt-8 flex flex-wrap gap-2 border-b border-white/8 pb-3"
        >
          {TABS.map((item) => {
            const active = tab === item.value;
            const Icon = item.icon;
            return (
              <Link
                key={item.value}
                href={tabHref(item.value)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition",
                  active
                    ? "bg-gradient-to-r from-brand to-brand-light text-white shadow-[0_10px_25px_-12px_rgba(128,0,255,0.9)]"
                    : "border border-white/10 bg-white/[0.03] text-ash hover:border-brand-light/40 hover:text-fog",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8">
          {tab === "grupos" && groupsData ? (
            <CommunityDirectory
              initialItems={groupsData[0].items.map((community) => ({
                id: community.id,
                slug: community.slug,
                name: community.name,
                description: community.description,
                emblemUrl: community.emblemUrl,
                city: community.city,
                category: community.category,
                createdAt: community.createdAt.toISOString(),
                creatorName: community.creator.name,
              }))}
              initialHasMore={groupsData[0].hasMore}
              initialTotal={groupsData[0].total}
              initialNextOffset={groupsData[0].nextOffset}
              filters={{ q, category, city }}
              cities={groupsData[1]}
              canCreate={Boolean(user)}
              createHref="/comunidade/criar"
            />
          ) : null}

          {tab === "forum" && forumData ? (
            <Forum
              initialItems={forumData[0].items}
              initialHasMore={forumData[0].hasMore}
              initialNextBefore={forumData[0].nextBefore}
              authenticated={Boolean(user)}
              currentName={user?.name ?? null}
              nickname={forumData[1]?.nickname ?? null}
            />
          ) : null}

          {tab === "mensagens" ? (
            user ? (
              <Messenger
                currentUserId={user.id}
                initialConversationId={first(params.c)?.slice(0, 80)}
              />
            ) : (
              <div className="panel flex flex-col items-center gap-4 rounded-3xl px-6 py-14 text-center">
                <LockKeyhole className="size-9 text-brand-light" aria-hidden="true" />
                <h2 className="text-xl font-bold text-fog">Mensagens privadas só para membros</h2>
                <p className="max-w-lg text-sm leading-relaxed text-ash">
                  Visitantes não acessam conversas diretas nem grupos privados. Entre na sua conta para
                  conversar com outros motociclistas. O fórum global continua aberto para participação anônima.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <ButtonLink href="/entrar?next=/comunidade%3Faba%3Dmensagens" size="md">
                    Entrar na conta
                  </ButtonLink>
                  <ButtonLink href="/cadastrar" variant="secondary" size="md">
                    Criar conta gratuita
                  </ButtonLink>
                  <Link
                    href="/comunidade?aba=forum"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-light hover:underline"
                  >
                    <MessageSquareText className="size-3.5" aria-hidden="true" /> Ir para o fórum
                  </Link>
                </div>
              </div>
            )
          ) : null}
        </div>

        <p className="mt-10 flex items-center justify-center gap-2 text-center text-xs text-ash/60">
          <ShieldCheck className="size-3.5 text-brand-light" aria-hidden="true" />
          Convites do WhatsApp são validados como links oficiais; a moderação pode ocultar grupos e mensagens.
        </p>
      </div>
    </div>
  );
}
