import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { NotificationsInbox } from "@/components/notifications/notifications-inbox";
import { PushPreferences } from "@/components/notifications/push-preferences";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPushConfigured } from "@/lib/push";

export const metadata: Metadata = {
  title: "Notificações",
  description: "Avisos de novos eventos, mensagens privadas e atualizações dos seus grupos.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/comunidade%2Fnotificacoes");

  const items = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      targetUrl: true,
      readAt: true,
      createdAt: true,
    },
  });

  const initialItems = items.map((item) => ({
    id: item.id,
    type: item.type,
    title: item.title,
    body: item.body,
    targetUrl: item.targetUrl,
    readAt: item.readAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  }));

  return (
    <div className="pb-16 pt-28 lg:pt-32">
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
          <span className="text-ash">Notificações</span>
        </nav>

        <header className="mt-5">
          <Link
            href="/comunidade"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-light transition hover:text-fog"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Voltar para a comunidade
          </Link>
          <p className="eyebrow mt-4">Sua conta</p>
          <h1 className="display mt-3 text-4xl leading-[0.95] text-fog sm:text-5xl">
            Central de <span className="text-gradient">notificações</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ash">
            Avisos de novos eventos, mensagens privadas e mudanças nos seus grupos. O histórico fica
            salvo na sua conta, mesmo que você feche o navegador.
          </p>
        </header>

        <div className="mt-8 space-y-6">
          <NotificationsInbox initialItems={initialItems} />
          <PushPreferences
            configured={isPushConfigured()}
            publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || null}
          />
        </div>
      </div>
    </div>
  );
}
