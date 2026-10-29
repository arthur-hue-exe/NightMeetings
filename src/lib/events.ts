import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getMonthRange, getTodayISO, getWeekendDates } from "@/lib/dates";

export const PAGE_SIZE = 9;

const listInclude = {
  user: { select: { id: true, name: true } },
  _count: {
    select: { attendances: { where: { cancelledAt: null } } },
  },
} satisfies Prisma.EventInclude;

export type EventListItem = Prisma.EventGetPayload<{ include: typeof listInclude }>;

const detailInclude = {
  user: { select: { id: true, name: true, createdAt: true } },
  images: { orderBy: { createdAt: "asc" } },
  _count: {
    select: { attendances: { where: { cancelledAt: null } } },
  },
} satisfies Prisma.EventInclude;

export type EventDetail = Prisma.EventGetPayload<{ include: typeof detailInclude }>;

export type EventSort = "upcoming" | "recent";
export type EventPeriod = "any" | "today" | "weekend" | "month";

export type EventFilters = {
  q?: string;
  city?: string;
  category?: string;
  date?: string;
  period?: EventPeriod;
  withRoute?: boolean;
  sort?: EventSort;
  page?: number;
  pageSize?: number;
};

function activeDateCondition(today: string): Prisma.EventWhereInput {
  return {
    OR: [{ endDate: null, eventDate: { gte: today } }, { endDate: { gte: today } }],
  };
}

export function activeWhere(today = getTodayISO()): Prisma.EventWhereInput {
  return {
    status: "ACTIVE",
    AND: [activeDateCondition(today)],
  };
}

export async function searchEvents(filters: EventFilters) {
  const today = getTodayISO();
  const and: Prisma.EventWhereInput[] = [
    { status: "ACTIVE" },
    activeDateCondition(today),
  ];

  const q = filters.q?.trim();
  if (q) {
    and.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { meetingPoint: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (filters.city) and.push({ city: filters.city });
  if (filters.category) and.push({ category: filters.category });

  if (filters.date) {
    and.push({
      OR: [
        { eventDate: filters.date },
        {
          AND: [
            { eventDate: { lte: filters.date } },
            { endDate: { gte: filters.date } },
          ],
        },
      ],
    });
  } else if (filters.period && filters.period !== "any") {
    if (filters.period === "today") {
      and.push({
        OR: [
          { eventDate: today },
          {
            AND: [
              { eventDate: { lte: today } },
              { endDate: { gte: today } },
            ],
          },
        ],
      });
    }
    if (filters.period === "weekend") {
      const { saturday, sunday } = getWeekendDates(today);
      and.push({
        OR: [
          { eventDate: { gte: saturday, lte: sunday } },
          {
            AND: [
              { eventDate: { lte: sunday } },
              { endDate: { gte: saturday } },
            ],
          },
        ],
      });
    }
    if (filters.period === "month") {
      const { start, end } = getMonthRange(today);
      and.push({
        OR: [
          { eventDate: { gte: start, lte: end } },
          {
            AND: [
              { eventDate: { lte: end } },
              { endDate: { gte: start } },
            ],
          },
        ],
      });
    }
  }

  if (filters.withRoute) {
    and.push({
      OR: [{ departurePoint: { not: null } }, { arrivalPoint: { not: null } }],
    });
  }

  const where: Prisma.EventWhereInput = { AND: and };
  const pageSize = Math.min(Math.max(filters.pageSize ?? PAGE_SIZE, 1), 24);
  const page = Math.max(filters.page ?? 1, 1);

  const orderBy: Prisma.EventOrderByWithRelationInput[] =
    filters.sort === "recent"
      ? [{ createdAt: "desc" }]
      : [{ eventDate: "asc" }, { startTime: "asc" }];

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: listInclude,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.event.count({ where }),
  ]);

  return {
    events,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getHomeData() {
  const today = getTodayISO();
  const active = activeWhere(today);

  const [upcoming, featured, routeRides, recent, activeCount, cityGroups, categoryGroups] =
    await Promise.all([
      prisma.event.findMany({
        where: active,
        include: listInclude,
        orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
        take: 6,
      }),
      prisma.event.findMany({
        where: { ...active, featured: true },
        include: listInclude,
        orderBy: [{ eventDate: "asc" }],
        take: 3,
      }),
      prisma.event.findMany({
        where: {
          ...active,
          OR: [{ departurePoint: { not: null } }, { arrivalPoint: { not: null } }],
        },
        include: listInclude,
        orderBy: [{ eventDate: "asc" }],
        take: 3,
      }),
      prisma.event.findMany({
        where: active,
        include: listInclude,
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
      prisma.event.count({ where: active }),
      prisma.event.groupBy({ by: ["city"], where: active, _count: { _all: true } }),
      prisma.event.groupBy({ by: ["category"], where: active, _count: { _all: true } }),
    ]);

  return {
    upcoming,
    featured,
    routeRides,
    recent,
    activeCount,
    cityCount: cityGroups.filter((group) => group.city !== "Outra cidade").length,
    categoryCounts: Object.fromEntries(
      categoryGroups.map((group) => [group.category, group._count._all]),
    ),
  };
}

export async function getEventBySlug(slug: string): Promise<EventDetail | null> {
  const event = await prisma.event.findUnique({
    where: { slug },
    include: detailInclude,
  });
  if (!event || event.status === "DELETED") return null;
  return event;
}

export async function getAttendingEventIds(userId: string, eventIds: string[]) {
  if (eventIds.length === 0) return new Set<string>();
  const attendances = await prisma.eventAttendance.findMany({
    where: { userId, eventId: { in: eventIds }, cancelledAt: null },
    select: { eventId: true },
  });
  return new Set(attendances.map((attendance) => attendance.eventId));
}

export async function isAttendingEvent(eventId: string, userId: string) {
  const attendance = await prisma.eventAttendance.findFirst({
    where: { eventId, userId, cancelledAt: null },
    select: { id: true },
  });
  return Boolean(attendance);
}

export async function getEventForOwner(id: string, userId: string) {
  return prisma.event.findFirst({
    where: { id, userId, status: { not: "DELETED" } },
    include: { images: { orderBy: { createdAt: "asc" } } },
  });
}

export async function getMyEvents(userId: string) {
  return prisma.event.findMany({
    where: { userId, status: { not: "DELETED" } },
    orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getOrganizerProfile(id: string) {
  const today = getTodayISO();
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdAt: true,
      events: {
        where: {
          status: "ACTIVE",
          AND: [activeDateCondition(today)],
        },
        include: listInclude,
        orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!user) return null;
  return user;
}

export async function getFilterOptions() {
  const today = getTodayISO();
  const active = activeWhere(today);
  const [cities, categories] = await Promise.all([
    prisma.event.groupBy({ by: ["city"], where: active, _count: { _all: true } }),
    prisma.event.groupBy({ by: ["category"], where: active, _count: { _all: true } }),
  ]);

  return {
    cities: cities
      .map((city) => ({ value: city.city, count: city._count._all }))
      .sort((a, b) => b.count - a.count),
    categoryCounts: Object.fromEntries(
      categories.map((category) => [category.category, category._count._all]),
    ),
  };
}

export async function getSitemapEvents() {
  const today = getTodayISO();
  return prisma.event.findMany({
    where: { status: "ACTIVE", AND: [activeDateCondition(today)] },
    select: { slug: true, updatedAt: true, createdAt: true },
    orderBy: { eventDate: "asc" },
    take: 1000,
  });
}

export function categoryCount(
  counts: Record<string, number>,
  value: string,
  fallback = 0,
) {
  return counts[value] ?? fallback;
}
