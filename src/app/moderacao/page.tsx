import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ModerationPanel } from "@/components/admin/moderation-panel";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Moderação",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/moderacao");
  if (user.role !== "ADMIN") notFound();

  return (
    <div className="pb-16 pt-28 lg:pt-32">
      <div className="shell max-w-5xl">
        <nav aria-label="Trilha de navegação" className="text-[0.7rem] uppercase tracking-[0.18em] text-ash/70">
          <Link href="/" className="transition hover:text-fog">
            Início
          </Link>
          <span aria-hidden="true" className="px-2">
            /
          </span>
          <span className="text-ash">Moderação</span>
        </nav>

        <header className="mt-5 max-w-3xl">
          <p className="eyebrow">Área restrita</p>
          <h1 className="display mt-3 flex flex-wrap items-center gap-3 text-4xl leading-[0.95] text-fog sm:text-5xl">
            <ShieldCheck className="size-9 text-brand-light" aria-hidden="true" />
            <span>
              Painel de <span className="text-gradient">moderação</span>
            </span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ash">
            Visível apenas para administradores autenticados. Todas as ações são registradas no log
            de moderação; o conteúdo denunciado nunca é apagado sem deixar registro.
          </p>
        </header>

        <div className="mt-8">
          <ModerationPanel />
        </div>
      </div>
    </div>
  );
}
