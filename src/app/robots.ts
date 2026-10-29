import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/utils";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/meus-eventos",
          "/eventos/criar",
          "/eventos/*/editar",
          "/comunidade/criar",
          "/comunidade/*/editar",
          "/comunidade/notificacoes",
          "/moderacao",
          "/entrar",
          "/cadastrar",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
