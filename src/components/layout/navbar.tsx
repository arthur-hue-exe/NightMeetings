"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LogOut, Menu, MessageSquare, Plus, ShieldCheck, User, UsersRound, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { ButtonLink, buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

type NavbarUser = { id: string; name: string; role?: string } | null;

type NavLink = { href: string; label: string; icon?: typeof UsersRound };

const links: NavLink[] = [
  { href: "/", label: "Início" },
  { href: "/eventos", label: "Explorar eventos" },
  { href: "/eventos/criar", label: "Criar evento" },
  { href: "/comunidade", label: "Comunidade", icon: UsersRound },
  { href: "/como-funciona", label: "Como funciona" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/eventos") {
    return pathname === "/eventos" || (pathname.startsWith("/eventos/") && pathname !== "/eventos/criar" && !pathname.endsWith("/editar"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function Navbar({ user }: { user: NavbarUser }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const solid = useMemo(() => scrolled || pathname !== "/" || menuOpen, [scrolled, pathname, menuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  return (
    <>
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300",
        solid
          ? "border-b border-white/8 bg-night/88 backdrop-blur-xl supports-[backdrop-filter]:bg-night/75"
          : "border-b border-transparent bg-gradient-to-b from-night/70 via-night/20 to-transparent",
      )}
    >
      <div className="shell flex h-20 items-center justify-between gap-4">
        <Logo priority />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navegação principal">
          {links.map((link) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-1.5 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  active ? "text-fog" : "text-ash hover:text-fog",
                )}
              >
                {Icon ? <Icon className="size-4 text-brand-light" aria-hidden="true" /> : null}
                {link.label}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-3.5 -bottom-0.5 h-[2px] origin-left rounded-full bg-gradient-to-r from-brand to-brand-light transition-transform duration-300",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          {user ? <NotificationBell /> : null}
          {user ? (
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className="flex h-10 items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] pl-1.5 pr-3 text-sm font-semibold text-fog transition hover:border-brand-light/45 hover:bg-white/[0.07]"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-light text-[0.65rem] font-extrabold text-white">
                  {initials(user.name)}
                </span>
                <span className="max-w-28 truncate">{user.name.split(" ")[0]}</span>
                <ChevronDown
                  className={cn("size-3.5 text-ash transition-transform", accountOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </button>

              {accountOpen ? (
                <div
                  role="menu"
                  aria-label="Menu da conta"
                  className="panel absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl p-2 shadow-2xl"
                >
                  <div className="border-b border-white/8 px-3 pb-3 pt-2">
                    <p className="text-sm font-semibold text-fog">{user.name}</p>
                    <p className="text-xs text-ash">Organizador MotorMeetings</p>
                  </div>
                  <div className="flex flex-col pt-1.5">
                    <Link
                      role="menuitem"
                      href="/comunidade?aba=mensagens"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ash transition hover:bg-white/[0.06] hover:text-fog"
                    >
                      <MessageSquare className="size-4" aria-hidden="true" /> Mensagens privadas
                    </Link>
                    <Link
                      role="menuitem"
                      href="/meus-eventos"
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ash transition hover:bg-white/[0.06] hover:text-fog"
                    >
                      <Plus className="size-4" aria-hidden="true" /> Meus eventos
                    </Link>
                    <Link
                      role="menuitem"
                      href={`/organizadores/${user.id}`}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ash transition hover:bg-white/[0.06] hover:text-fog"
                    >
                      <User className="size-4" aria-hidden="true" /> Meu perfil público
                    </Link>
                    {user.role === "ADMIN" ? (
                      <Link
                        role="menuitem"
                        href="/moderacao"
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ash transition hover:bg-white/[0.06] hover:text-fog"
                      >
                        <ShieldCheck className="size-4" aria-hidden="true" /> Moderação
                      </Link>
                    ) : null}
                    <form action={signOutAction}>
                      <button
                        role="menuitem"
                        type="submit"
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ash transition hover:bg-red-500/10 hover:text-red-300"
                      >
                        <LogOut className="size-4" aria-hidden="true" /> Sair
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              href="/entrar"
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                pathname === "/entrar" ? "text-fog" : "text-ash hover:text-fog",
              )}
            >
              Entrar
            </Link>
          )}

          <ButtonLink href="/eventos/criar" size="sm" className="h-10 px-5">
            <Plus className="size-4" aria-hidden="true" />
            Publicar evento
          </ButtonLink>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {user ? <NotificationBell compact /> : null}
          <ButtonLink href="/eventos/criar" size="sm" className="h-9 px-3.5 text-[0.7rem]">
            <Plus className="size-3.5" aria-hidden="true" />
            Publicar
          </ButtonLink>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            className="flex size-10 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-fog transition hover:border-brand-light/40"
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
    </header>

      <div
        id="menu-mobile"
        ref={menuRef}
        data-open={menuOpen}
        aria-hidden={!menuOpen}
        className={cn(
          "fixed inset-0 z-40 flex flex-col overflow-y-auto bg-night/97 px-6 pb-8 pt-24 backdrop-blur-2xl transition-[opacity,visibility] duration-300 lg:hidden",
          menuOpen ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(60%_100%_at_80%_0%,rgba(128,0,255,0.2),transparent_70%)]" />
        <nav aria-label="Navegação mobile" className="relative flex flex-col">
          {links.map((link, index) => {
            const active = isActive(pathname, link.href);
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                style={{ transitionDelay: menuOpen ? `${80 + index * 45}ms` : "0ms" }}
                className={cn(
                  "display flex items-center justify-between border-b border-white/8 py-4 text-3xl transition-all duration-300",
                  menuOpen ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                  active ? "text-brand-light" : "text-fog",
                )}
              >
                <span className="flex items-center gap-3">
                  {Icon ? <Icon className="size-6 text-brand-light" aria-hidden="true" /> : null}
                  {link.label}
                </span>
                <span aria-hidden="true" className="text-base text-ash">
                  0{index + 1}
                </span>
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            "relative mt-auto space-y-3 pt-8 transition-all delay-300 duration-300",
            menuOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
          )}
        >
          {user ? (
            <>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                <p className="text-sm font-semibold text-fog">{user.name}</p>
                <p className="text-xs text-ash">Conta conectada</p>
              </div>
              <ButtonLink href="/meus-eventos" variant="secondary" size="lg" className="w-full">
                Meus eventos
              </ButtonLink>
              <ButtonLink href={`/organizadores/${user.id}`} variant="secondary" size="lg" className="w-full">
                Meu perfil
              </ButtonLink>
              <ButtonLink href="/comunidade?aba=mensagens" variant="secondary" size="lg" className="w-full">
                Mensagens privadas
              </ButtonLink>
              <ButtonLink href="/comunidade/notificacoes" variant="secondary" size="lg" className="w-full">
                Notificações
              </ButtonLink>
              {user.role === "ADMIN" ? (
                <ButtonLink href="/moderacao" variant="secondary" size="lg" className="w-full">
                  Moderação
                </ButtonLink>
              ) : null}
              <form action={signOutAction}>
                <button type="submit" className={buttonVariants({ variant: "ghost", size: "lg", className: "w-full" })}>
                  Sair da conta
                </button>
              </form>
            </>
          ) : (
            <>
              <ButtonLink href="/entrar" variant="secondary" size="lg" className="w-full">
                Entrar
              </ButtonLink>
              <ButtonLink href="/cadastrar" size="lg" className="w-full">
                Criar minha conta
              </ButtonLink>
            </>
          )}
          <p className="pt-1 text-center text-[0.7rem] uppercase tracking-[0.2em] text-ash/70">
            Goiânia • Aparecida • Região
          </p>
        </div>
      </div>
    </>
  );
}
