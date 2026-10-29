import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin, jsonError } from "@/lib/api";
import { getTodayISO } from "@/lib/dates";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

const MUTATION_LIMIT = 30;
const MUTATION_WINDOW_MS = 60_000;

async function activeCount(eventId: string) {
  return prisma.eventAttendance.count({
    where: { eventId, cancelledAt: null },
  });
}

function isExpired(event: { eventDate: string; endDate: string | null }) {
  return (event.endDate ?? event.eventDate) < getTodayISO();
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!event || event.status === "DELETED") {
    return jsonError("Evento não encontrado.", 404);
  }

  const [count, user] = await Promise.all([activeCount(id), getCurrentUser()]);
  const attending = user
    ? Boolean(
        await prisma.eventAttendance.findFirst({
          where: { eventId: id, userId: user.id, cancelledAt: null },
          select: { id: true },
        }),
      )
    : false;

  return NextResponse.json({ ok: true, count, attending });
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return jsonError("Origem da requisição não autorizada.", 403);
  }

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para confirmar presença.", 401);

  const limit = rateLimit(`attendance:${user.id}`, MUTATION_LIMIT, MUTATION_WINDOW_MS);
  if (!limit.ok) {
    return jsonError("Muitas tentativas. Aguarde um instante e tente novamente.", 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const { id } = await context.params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, status: true, eventDate: true, endDate: true },
  });

  if (!event || event.status === "DELETED") {
    return jsonError("Evento não encontrado.", 404);
  }

  if (event.status !== "ACTIVE") {
    return jsonError("Este evento foi cancelado pelo organizador.", 409);
  }

  if (isExpired(event)) {
    return jsonError("Este evento já foi encerrado. Não é possível confirmar presença.", 409);
  }

  try {
    try {
      await prisma.eventAttendance.upsert({
        where: { eventId_userId: { eventId: id, userId: user.id } },
        create: { eventId: id, userId: user.id },
        update: { cancelledAt: null },
      });
    } catch (error) {
      // Duas requisições simultâneas podem disputar o INSERT; a chave única
      // garante que a segunda apenas reative o registro existente.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        await prisma.eventAttendance.updateMany({
          where: { eventId: id, userId: user.id },
          data: { cancelledAt: null },
        });
      } else {
        throw error;
      }
    }

    const count = await activeCount(id);
    return NextResponse.json({ ok: true, attending: true, count });
  } catch (error) {
    console.error("Falha ao confirmar presença", { eventId: id }, error);
    return jsonError("Não foi possível confirmar sua presença agora.", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return jsonError("Origem da requisição não autorizada.", 403);
  }

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para cancelar sua presença.", 401);

  const limit = rateLimit(`attendance:${user.id}`, MUTATION_LIMIT, MUTATION_WINDOW_MS);
  if (!limit.ok) {
    return jsonError("Muitas tentativas. Aguarde um instante e tente novamente.", 429, {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const { id } = await context.params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!event || event.status === "DELETED") {
    return jsonError("Evento não encontrado.", 404);
  }

  try {
    await prisma.eventAttendance.updateMany({
      where: { eventId: id, userId: user.id, cancelledAt: null },
      data: { cancelledAt: new Date() },
    });

    const count = await activeCount(id);
    return NextResponse.json({ ok: true, attending: false, count });
  } catch (error) {
    console.error("Falha ao cancelar presença", { eventId: id }, error);
    return jsonError("Não foi possível cancelar sua presença agora.", 500);
  }
}
