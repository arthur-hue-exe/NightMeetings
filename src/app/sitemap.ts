import type { MetadataRoute } from "next";
import { getSitemapEvents } from "@/lib/events";
import { prisma } from "@/lib/db";
import { getSiteUrl } from "@/lib/utils";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const [events, communities] = await Promise.all([
    getSitemapEvents(),
    prisma.community.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 500,
    }),
  ]);

  const staticRoutes = [
    { path: "/", priority: 1, changeFrequency: "daily" as const },
    { path: "/eventos", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/comunidade", priority: 0.8, changeFrequency: "daily" as const },
    { path: "/como-funciona", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/sobre", priority: 0.5, changeFrequency: "monthly" as const },
    { path: "/privacidade", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/termos", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/cookies", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route.path}`,
      lastModified: new Date(),
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...events.map((event) => ({
      url: `${base}/eventos/${event.slug}`,
      lastModified: event.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...communities.map((community) => ({
      url: `${base}/comunidade/${community.slug}`,
      lastModified: community.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
