import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fieldErrors, isSameOrigin, jsonError, validationMessage } from "@/lib/api";
import { getTodayISO } from "@/lib/dates";
import { rateLimit } from "@/lib/rate-limit";
import { buildSlug } from "@/lib/slug";
import { notifyNewEvent } from "@/lib/notifications";
import {
  eventSchema,
  normalizeInstagram,
  normalizeOptional,
  type EventInput,
} from "@/lib/validation";

export const runtime = "nodejs";

function eventData(input: EventInput) {
  return {
    title: input.title,
    category: input.category,
    city: input.city,
    eventDate: input.eventDate,
    startTime: input.startTime,
    endDate: normalizeOptional(input.endDate),
    meetingPoint: input.meetingPoint,
    description: normalizeOptional(input.description),
    departurePoint: normalizeOptional(input.departurePoint),
    departureTime: normalizeOptional(input.departureTime),
    arrivalPoint: normalizeOptional(input.arrivalPoint),
    arrivalDate: normalizeOptional(input.arrivalDate),
    arrivalTime: normalizeOptional(input.arrivalTime),
    routeNotes: normalizeOptional(input.routeNotes),
    rules: normalizeOptional(input.rules),
    additionalInfo: normalizeOptional(input.additionalInfo),
    contactInstagram: normalizeInstagram(input.contactInstagram),
    coverImageUrl: normalizeOptional(input.coverImageUrl),
  };
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError("Origem da requisição não autorizada.", 403);
  }

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para publicar um evento.", 401);

  const limit = rateLimit(`event-create:${user.id}`, 12, 60 * 60 * 1000);
  if (!limit.ok) {
    return jsonError("Você publicou muitos eventos em pouco tempo. Tente novamente mais tarde.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler os dados enviados.", 400);
  }

  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(validationMessage(parsed.error), 422, {
      fieldErrors: fieldErrors(parsed.error),
    });
  }

  const input = parsed.data;
  const today = getTodayISO();
  if (input.eventDate < today) {
    return jsonError("A data do evento não pode estar no passado.", 422, {
      fieldErrors: { eventDate: "Escolha uma data a partir de hoje." },
    });
  }

  const data = eventData(input);
  const gallery = Array.from(new Set(input.images ?? [])).filter(
    (url) => url !== data.coverImageUrl,
  );

  try {
    let slug = buildSlug(input.title);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await prisma.event.findUnique({ where: { slug }, select: { id: true } });
      if (!exists) break;
      slug = buildSlug(input.title);
    }

    const event = await prisma.event.create({
      data: {
        ...data,
        slug,
        userId: user.id,
        images: {
          create: gallery.map((imageUrl, index) => ({
            imageUrl,
            altText: `${input.title} — foto ${index + 1}`,
          })),
        },
      },
      select: { id: true, slug: true, title: true, city: true },
    });

    await notifyNewEvent({
      id: event.id,
      title: event.title,
      slug: event.slug,
      city: event.city,
      userId: user.id,
    }).catch((notifyError) => {
      console.error("Falha ao notificar novo evento", notifyError);
    });

    return NextResponse.json(
      { ok: true, event: { id: event.id, slug: event.slug } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Falha ao criar evento", error);
    return jsonError("Não foi possível publicar o evento agora. Tente novamente.", 500);
  }
}
