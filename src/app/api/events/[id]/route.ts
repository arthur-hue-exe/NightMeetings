import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fieldErrors, isSameOrigin, jsonError, validationMessage } from "@/lib/api";
import { getTodayISO } from "@/lib/dates";
import { deleteUploadByUrl } from "@/lib/storage";
import {
  eventSchema,
  normalizeInstagram,
  normalizeOptional,
  type EventInput,
} from "@/lib/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

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

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return jsonError("Origem da requisição não autorizada.", 403);
  }

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para editar o evento.", 401);

  const { id } = await context.params;
  const event = await prisma.event.findUnique({
    where: { id },
    include: { images: true },
  });

  if (!event || event.status === "DELETED") {
    return jsonError("Evento não encontrado.", 404);
  }

  if (event.userId !== user.id) {
    return jsonError("Você não tem permissão para editar este evento.", 403);
  }

  if ((event.endDate ?? event.eventDate) < getTodayISO()) {
    return jsonError("Este evento já foi encerrado e não pode mais ser editado.", 409);
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
  if (input.eventDate < getTodayISO()) {
    return jsonError("A data do evento não pode estar no passado.", 422, {
      fieldErrors: { eventDate: "Escolha uma data a partir de hoje." },
    });
  }

  const data = eventData(input);
  const gallery = Array.from(new Set(input.images ?? [])).filter(
    (url) => url !== data.coverImageUrl,
  );

  try {
    const oldUrls = new Set(
      [event.coverImageUrl, ...event.images.map((image) => image.imageUrl)].filter(
        (url): url is string => Boolean(url),
      ),
    );
    const newUrls = new Set<string>(gallery);
    if (data.coverImageUrl) newUrls.add(data.coverImageUrl);

    await prisma.$transaction([
      prisma.eventImage.deleteMany({ where: { eventId: id } }),
      prisma.eventImage.createMany({
        data: gallery.map((imageUrl, index) => ({
          eventId: id,
          imageUrl,
          altText: `${input.title} — foto ${index + 1}`,
        })),
      }),
      prisma.event.update({
        where: { id },
        data: {
          ...data,
          status: event.status === "CANCELLED" ? "CANCELLED" : event.status,
        },
      }),
    ]);

    for (const url of oldUrls) {
      if (!newUrls.has(url)) {
        await deleteUploadByUrl(url);
      }
    }

    return NextResponse.json({ ok: true, event: { id, slug: event.slug } });
  } catch (error) {
    console.error("Falha ao editar evento", error);
    return jsonError("Não foi possível salvar as alterações agora.", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) {
    return jsonError("Origem da requisição não autorizada.", 403);
  }

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para excluir o evento.", 401);

  const { id } = await context.params;
  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  });

  if (!event || event.status === "DELETED") {
    return jsonError("Evento não encontrado.", 404);
  }

  if (event.userId !== user.id) {
    return jsonError("Você não tem permissão para excluir este evento.", 403);
  }

  await prisma.event.update({
    where: { id },
    data: { status: "DELETED" },
  });

  return NextResponse.json({ ok: true });
}
