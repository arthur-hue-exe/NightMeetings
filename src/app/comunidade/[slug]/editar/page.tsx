import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CommunityForm } from "@/components/community/community-form";
import { getCurrentUser } from "@/lib/auth";
import { getCommunityBySlug } from "@/lib/community";

export const metadata: Metadata = {
  title: "Editar comunidade",
  robots: { index: false, follow: false },
};

export default async function EditCommunityPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=/comunidade/${encodeURIComponent(slug)}/editar`);

  const community = await getCommunityBySlug(slug, true);
  if (!community) notFound();
  if (community.creatorId !== user.id && user.role !== "ADMIN") notFound();

  return (
    <div className="pb-10 pt-28 lg:pt-32">
      <div className="shell max-w-4xl">
        <nav aria-label="Trilha de navegação" className="text-[0.7rem] uppercase tracking-[0.18em] text-ash/70">
          <Link href="/" className="transition hover:text-fog">
            Início
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <Link href="/comunidade" className="transition hover:text-fog">
            Comunidade
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <Link href={`/comunidade/${community.slug}`} className="transition hover:text-fog">
            {community.name}
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <span className="text-ash">Editar</span>
        </nav>

        <header className="mt-5 max-w-2xl">
          <p className="eyebrow">Gerenciar grupo</p>
          <h1 className="display mt-3 text-5xl leading-[0.92] text-fog sm:text-6xl">
            Editar <span className="text-gradient">comunidade</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ash sm:text-base">
            Atualize nome, categoria, descrição, emblema ou convite. Alterações são registradas pelo
            proprietário ou pela administração.
          </p>
        </header>

        <div className="mt-8">
          <CommunityForm
            mode="edit"
            communityId={community.id}
            initial={{
              name: community.name,
              description: community.description ?? "",
              city: community.city ?? "",
              category: community.category,
              emblemUrl: community.emblemUrl,
              whatsappInviteUrl: community.whatsappInviteUrl,
            }}
          />
        </div>
      </div>
    </div>
  );
}
