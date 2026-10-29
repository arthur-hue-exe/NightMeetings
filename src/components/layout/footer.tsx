import Link from "next/link";
import { Instagram, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { CookiePreferencesButton } from "@/components/consent/cookie-preferences-button";
import { INSTAGRAM_URL, SITE_DESCRIPTION } from "@/lib/constants";

type FooterUser = { id: string; name: string; role?: string } | null;

export function Footer({ user }: { user: FooterUser }) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-white/8 bg-night-2/50">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 right-0 size-[34rem] rounded-full bg-brand/10 blur-[120px]"
      />

      <div className="shell relative py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo size="lg" />
            <p className="mt-5 text-sm leading-relaxed text-ash">{SITE_DESCRIPTION}</p>
            <p className="mt-4 text-[0.7rem] font-bold uppercase tracking-[0.2em] text-brand-light">
              Criado para conectar quem vive sobre duas rodas.
            </p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-ash transition hover:border-brand-light/40 hover:text-fog"
            >
              <Instagram className="size-4" aria-hidden="true" />
              @a.alves_silva
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </div>

          <FooterColumn title="Plataforma">
            <FooterLink href="/">Início</FooterLink>
            <FooterLink href="/eventos">Explorar eventos</FooterLink>
            <FooterLink href="/eventos/criar">Publicar evento</FooterLink>
            <FooterLink href="/comunidade">Comunidade</FooterLink>
            <FooterLink href="/como-funciona">Como funciona</FooterLink>
          </FooterColumn>

          <FooterColumn title="Sua conta">
            {user ? (
              <>
                <FooterLink href="/meus-eventos">Meus eventos</FooterLink>
                <FooterLink href={`/organizadores/${user.id}`}>Meu perfil</FooterLink>
                <FooterLink href="/comunidade?aba=mensagens">Mensagens privadas</FooterLink>
                <FooterLink href="/comunidade/notificacoes">Notificações</FooterLink>
                {user.role === "ADMIN" ? <FooterLink href="/moderacao">Moderação</FooterLink> : null}
              </>
            ) : (
              <>
                <FooterLink href="/entrar">Entrar</FooterLink>
                <FooterLink href="/cadastrar">Criar conta</FooterLink>
              </>
            )}
            <FooterLink href="/sobre">Sobre o MotorMeetings</FooterLink>
          </FooterColumn>

          <FooterColumn title="Institucional">
            <FooterLink href="/privacidade">Política de privacidade</FooterLink>
            <FooterLink href="/termos">Termos de uso</FooterLink>
            <FooterLink href="/cookies">Política de cookies</FooterLink>
            <li>
              <CookiePreferencesButton />
            </li>
            <li>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-ash transition hover:text-fog"
              >
                Instagram <span className="sr-only">(abre em nova aba)</span>
              </a>
            </li>
          </FooterColumn>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/8 pt-6 text-xs text-ash/80 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} MotorMeetings. Todos os direitos reservados.</p>
          <p className="inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5 text-brand-light" aria-hidden="true" />
            Feito para a comunidade motociclista de Goiás.
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[0.7rem] font-extrabold uppercase tracking-[0.22em] text-fog">{title}</h2>
      <ul className="mt-4 flex flex-col gap-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-ash transition hover:text-fog">
        {children}
      </Link>
    </li>
  );
}
