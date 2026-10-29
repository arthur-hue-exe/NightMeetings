import type { Metadata } from "next";
import Link from "next/link";
import { Cookie, Settings2, ShieldCheck } from "lucide-react";
import { CookiePreferencesButton } from "@/components/consent/cookie-preferences-button";
import { getConsent } from "@/lib/consent";
import { COOKIE_CONSENT_VERSION } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Política de cookies",
  description:
    "Entenda quais cookies o MotorMeetings usa, o que é opcional e como alterar sua escolha a qualquer momento.",
  alternates: { canonical: "/cookies" },
};

export const dynamic = "force-dynamic";

const UPDATED_AT = "29 de outubro de 2026";

const COOKIES = [
  {
    name: "mm_session",
    kind: "Necessário",
    purpose: "Mantém você autenticado na sua conta por até 30 dias.",
    duration: "30 dias",
  },
  {
    name: "mm_anon",
    kind: "Necessário",
    purpose:
      "Identifica sua sessão anônima no fórum, garantindo um apelido estável e limites de envio.",
    duration: "30 dias",
  },
  {
    name: "mm_consent",
    kind: "Necessário",
    purpose: "Guarda sua escolha de consentimento para não repetir o aviso a cada visita.",
    duration: "12 meses",
  },
  {
    name: "Preferências",
    kind: "Opcional",
    purpose: "Lembraria ajustes de navegação. Só é gravado se você autorizar.",
    duration: "12 meses",
  },
  {
    name: "Medição",
    kind: "Opcional",
    purpose: "Ajudaria a entender o uso agregado do site. Só é ativado com o seu consentimento.",
    duration: "12 meses",
  },
] as const;

export default async function CookiesPage() {
  const consent = await getConsent();

  const status = !consent.decided
    ? "Nenhuma escolha registrada ainda. O banner aparece no rodapé da tela para você decidir."
    : consent.preferences && consent.analytics
      ? "Você aceitou todas as categorias opcionais."
      : consent.preferences || consent.analytics
        ? `Você liberou ${[consent.preferences ? "preferências" : null, consent.analytics ? "medição" : null]
            .filter(Boolean)
            .join(" e ")}; o restante segue bloqueado.`
        : "Você rejeitou as categorias opcionais. O site funciona normalmente.";

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
          <span className="text-ash">Cookies</span>
        </nav>

        <header className="mt-5">
          <p className="eyebrow">Privacidade</p>
          <h1 className="display mt-3 text-5xl leading-[0.92] text-fog sm:text-6xl">
            Política de <span className="text-gradient">cookies</span>
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ash">
            Usamos o mínimo de cookies para o site funcionar. Categorias opcionais permanecem
            desligadas até você autorizar. Nenhum recurso essencial é bloqueado caso você rejeite.
            Última atualização: {UPDATED_AT}.
          </p>
        </header>

        <section className="panel mt-8 rounded-3xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-brand/25 bg-brand/10 text-brand-light">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-fog">Sua escolha atual</h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-ash">{status}</p>
                <p className="mt-2 text-[0.68rem] uppercase tracking-wide text-ash/60">
                  Versão do consentimento: {COOKIE_CONSENT_VERSION}
                </p>
              </div>
            </div>
            <CookiePreferencesButton className="inline-flex items-center gap-2 rounded-full border border-brand/45 px-4 py-2 text-xs font-semibold text-brand-light transition hover:bg-brand/10" />
          </div>
        </section>

        <section className="mt-8" aria-labelledby="lista-title">
          <h2 id="lista-title" className="display text-2xl tracking-wide text-fog">
            Cookies utilizados
          </h2>
          <div className="panel mt-4 overflow-hidden rounded-2xl">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Lista de cookies do MotorMeetings</caption>
              <thead className="border-b border-white/8 bg-white/[0.03] text-[0.65rem] uppercase tracking-[0.14em] text-ash">
                <tr>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Nome
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Categoria
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Finalidade
                  </th>
                  <th scope="col" className="px-4 py-3 font-bold">
                    Duração
                  </th>
                </tr>
              </thead>
              <tbody>
                {COOKIES.map((cookie) => (
                  <tr key={cookie.name} className="border-b border-white/5 last:border-0">
                    <th scope="row" className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-fog">
                      {cookie.name}
                    </th>
                    <td className="px-4 py-3">
                      <span
                        className={
                          cookie.kind === "Necessário"
                            ? "rounded-full border border-emerald-400/35 bg-emerald-500/10 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-emerald-300"
                            : "rounded-full border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide text-ash"
                        }
                      >
                        {cookie.kind}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs leading-relaxed text-ash">{cookie.purpose}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ash">{cookie.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8 space-y-4 text-sm leading-relaxed text-ash" aria-labelledby="detalhes-title">
          <h2 id="detalhes-title" className="display text-2xl tracking-wide text-fog">
            Como funciona
          </h2>
          <p>
            <strong className="text-fog">Necessários:</strong> garantem login, sessão do fórum e
            segurança. Não podem ser desativados sem quebrar o site, por isso não dependem de
            consentimento.
          </p>
          <p>
            <strong className="text-fog">Opcionais:</strong> preferências e medição. Nada é carregado
            nessas categorias antes da sua autorização, e você pode mudar de ideia clicando em
            “Preferências de cookies” (também disponível no rodapé).
          </p>
          <p>
            <strong className="text-fog">Notificações push:</strong> ao ativar as notificações, o
            navegador cria uma inscrição própria do serviço de push. Ela pode ser removida a qualquer
            momento em{" "}
            <Link href="/comunidade/notificacoes" className="text-brand-light underline-offset-2 hover:underline">
              Notificações
            </Link>{" "}
            ou nas configurações do navegador. Não usamos essa inscrição para rastreamento.
          </p>
          <p>
            Para entender como tratamos dados pessoais, consulte a{" "}
            <Link href="/privacidade" className="text-brand-light underline-offset-2 hover:underline">
              Política de privacidade
            </Link>{" "}
            e os{" "}
            <Link href="/termos" className="text-brand-light underline-offset-2 hover:underline">
              Termos de uso
            </Link>
            .
          </p>
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-3 text-xs text-ash">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-semibold">
            <Cookie className="size-3.5 text-brand-light" aria-hidden="true" /> Sem cookies de anúncio
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 font-semibold">
            <Settings2 className="size-3.5 text-brand-light" aria-hidden="true" /> Escolha reversível
          </span>
        </div>
      </div>
    </div>
  );
}
