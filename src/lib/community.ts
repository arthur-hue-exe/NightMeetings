import { prisma } from "@/lib/db";
import { MAX_COMMUNITY_PAGE_SIZE } from "@/lib/constants";

export type CommunityListItem = Awaited<ReturnType<typeof listCommunities>>["items"][number];

export async function listCommunities(input: {
  q?: string;
  category?: string;
  city?: string;
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(Math.max(input.limit ?? MAX_COMMUNITY_PAGE_SIZE, 1), MAX_COMMUNITY_PAGE_SIZE);
  const offset = Math.max(input.offset ?? 0, 0);
  const where = {
    status: "ACTIVE",
    ...(input.q
      ? {
          OR: [
            { name: { contains: input.q } },
            { description: { contains: input.q } },
            { city: { contains: input.q } },
          ],
        }
      : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(input.city ? { city: input.city } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.community.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit + 1,
      include: { creator: { select: { id: true, name: true } } },
    }),
    prisma.community.count({ where }),
  ]);

  return {
    items: items.slice(0, limit),
    total,
    hasMore: items.length > limit,
    nextOffset: offset + Math.min(items.length, limit),
  };
}

export async function getCommunityBySlug(slug: string, includeDisabled = false) {
  return prisma.community.findFirst({
    where: { slug, ...(includeDisabled ? {} : { status: "ACTIVE" }) },
    include: { creator: { select: { id: true, name: true, createdAt: true } } },
  });
}

export async function getPublicCommunityCities() {
  const rows = await prisma.community.findMany({
    where: { status: "ACTIVE", city: { not: null } },
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });
  return rows.map((row) => row.city).filter((city): city is string => Boolean(city));
}
