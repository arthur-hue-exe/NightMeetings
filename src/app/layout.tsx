import type { Metadata, Viewport } from "next";
import { displayFont, sansFont } from "./fonts";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { getConsent } from "@/lib/consent";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ConsentBanner } from "@/components/consent/consent-banner";
import { DayRefresh } from "@/components/motion/day-refresh";
import { getSiteUrl, cn } from "@/lib/utils";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";

const siteUrl = getSiteUrl();
const defaultTitle = `${SITE_NAME} — Encontros de motos em Goiânia e região`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  generator: "Next.js",
  keywords: [
    "encontros de motos Goiânia",
    "rolê noturno",
    "eventos de moto",
    "motociclistas Goiás",
    "Aparecida de Goiânia",
    "MotorMeetings",
  ],
  authors: [{ name: "Arthur Alves", url: "https://www.instagram.com/a.alves_silva/" }],
  creator: "Arthur Alves",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "/",
    siteName: SITE_NAME,
    title: defaultTitle,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/images/og-default.jpg",
        width: 1200,
        height: 630,
        alt: "MotorMeetings — encontros de motos em Goiânia e região",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: SITE_DESCRIPTION,
    images: ["/images/og-default.jpg"],
  },
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#08070B",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [user, consent] = await Promise.all([getCurrentUser(), getConsent()]);
  const publicUser = user ? { id: user.id, name: user.name, role: user.role } : null;

  return (
    <html lang="pt-BR" className={cn(sansFont.variable, displayFont.variable)}>
      <body className="min-h-svh">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-brand focus:px-5 focus:py-3 focus:text-sm focus:font-bold focus:text-white"
        >
          Pular para o conteúdo
        </a>
        <Navbar user={publicUser} />
        <main id="conteudo" className="relative">
          {children}
        </main>
        <Footer user={publicUser} />
        <ConsentBanner decided={consent.decided} />
        <DayRefresh />
      </body>
    </html>
  );
}
