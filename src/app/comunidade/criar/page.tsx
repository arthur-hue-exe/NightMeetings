import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CommunityForm } from "@/components/community/community-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Criar comunidade",
  description:
    "Publique um grupo de motociclistas com emblema e convite oficial do WhatsApp no MotorMeetings.",
  alternates: { canonical: "/comunidade/criar" },
  robots: { index: false, follow: true },
};

export default async function CreateCommunityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/comunidade/criar");

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
          <span className="text-ash">Criar</span>
        </nav>

        <header className="mt-5 max-w-2xl">
          <p className="eyebrow">Novo grupo</p>
          <h1 className="display mt-3 text-5xl leading-[0.92] text-fog sm:text-6xl">
            Crie sua <span className="text-gradient">comunidade</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-ash sm:text-base">
            O emblema é obrigatório e o convite precisa ser um link oficial do WhatsApp
            (chat.whatsapp.com). Não inventamos links nem exibimos números de membros.
          </p>
        </header>

        <div className="mt-8">
          <CommunityForm mode="create" />
        </div>
      </div>
    </div>
  );
}
