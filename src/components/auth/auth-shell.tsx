import Image from "next/image";
import { Camera, Route, Users } from "lucide-react";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh pt-20">
      <div className="grid min-h-[calc(100svh-5rem)] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden overflow-hidden border-r border-white/6 lg:block">
          <Image
            src="/images/hero-night.webp"
            alt=""
            fill
            priority
            sizes="55vw"
            className="object-cover object-[60%_center]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-night via-night/65 to-night/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-night/50 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-night/70 to-transparent" />

          <div className="relative flex h-full flex-col justify-end p-10 xl:p-14">
            <div className="max-w-lg">
              <p className="eyebrow">Comunidade sobre duas rodas</p>
              <h2 className="display mt-4 text-5xl leading-[0.94] text-fog xl:text-6xl">
                A estrada fica melhor <span className="text-gradient">em grupo.</span>
              </h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-ash">
                O MotorMeetings conecta motociclistas de Goiânia, Aparecida e região em encontros
                reais, com data, rota e ponto de encontro definidos.
              </p>

              <ul className="mt-8 grid gap-3 text-sm text-ash">
                <li className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brand-light">
                    <Route className="size-4" aria-hidden="true" />
                  </span>
                  Roteiros com concentração, saída e chegada
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brand-light">
                    <Camera className="size-4" aria-hidden="true" />
                  </span>
                  Galeria de fotos do encontro e da moto
                </li>
                <li className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brand-light">
                    <Users className="size-4" aria-hidden="true" />
                  </span>
                  Organizadores com perfil público e eventos próprios
                </li>
              </ul>
            </div>

            <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-ash/60">
              Goiânia • Aparecida de Goiânia • Região metropolitana
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center px-5 py-12 sm:px-8 lg:py-16">
          <div className="w-full max-w-md">
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="display mt-3 text-4xl leading-[0.95] text-fog sm:text-5xl">{title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-ash">{description}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
