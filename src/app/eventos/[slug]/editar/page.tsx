import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarX2 } from "lucide-react";
import { EventForm, type EventFormValues } from "@/components/events/event-form";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, getTodayISO, isEventExpired } from "@/lib/dates";
import { getEventBySlug } from "@/lib/events";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return {
    title: event ? `Editar ${event.title}` : "Editar evento",
    robots: { index: false, follow: false },
  };
}

export default async function EditEventPage({ params }: PageProps) {
  const { slug } = await params;
  const [event, user] = await Promise.all([getEventBySlug(slug), getCurrentUser()]);

  if (!event) notFound();

  if (!user) {
    redirect(`/entrar?next=${encodeURIComponent(`/eventos/${slug}/editar`)}`);
  }

  if (event.userId !== user.id) notFound();

  const expired = isEventExpired(event.endDate, event.eventDate, getTodayISO());

  if (expired) {
    return (
      <div className="shell max-w-2xl py-16 sm:py-24">
        <div className="panel rounded-[2rem] p-6 text-center sm:p-10">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
            <CalendarX2 className="size-6" aria-hidden="true" />
          </span>
          <h1 className="display mt-5 text-4xl tracking-wide text-fog">Evento encerrado</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ash">
            {event.title} aconteceu em {formatDate(event.endDate ?? event.eventDate)}. Eventos
            encerrados ficam disponíveis para consulta, mas não podem mais ser editados.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href={`/eventos/${event.slug}`} variant="secondary">
              Ver página do evento
            </ButtonLink>
            <ButtonLink href="/meus-eventos" variant="primary">
              Meus eventos
            </ButtonLink>
          </div>
          <p className="mt-4 text-xs text-ash">
            Precisa divulgar de novo?{" "}
            <Link href="/eventos/criar" className="font-semibold text-brand-light hover:text-brand">
              Crie um novo evento
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  const initialValues: Partial<EventFormValues> = {
    title: event.title,
    category: event.category as EventFormValues["category"],
    city: event.city,
    eventDate: event.eventDate,
    startTime: event.startTime,
    endDate: event.endDate ?? "",
    meetingPoint: event.meetingPoint,
    description: event.description ?? "",
    departurePoint: event.departurePoint ?? "",
    departureTime: event.departureTime ?? "",
    arrivalPoint: event.arrivalPoint ?? "",
    arrivalDate: event.arrivalDate ?? "",
    arrivalTime: event.arrivalTime ?? "",
    routeNotes: event.routeNotes ?? "",
    rules: event.rules ?? "",
    additionalInfo: event.additionalInfo ?? "",
    contactInstagram: event.contactInstagram ? `@${event.contactInstagram}` : "",
    coverImageUrl: event.coverImageUrl ?? "",
    images: event.images.map((image) => image.imageUrl),
  };

  return (
    <div className="shell pb-14 pt-28">
      <p className="mb-3 text-xs text-ash">
        <Link href="/meus-eventos" className="font-semibold text-brand-light hover:text-brand">
          Meus eventos
        </Link>{" "}
        / Editar
      </p>
      <EventForm
        mode="edit"
        eventId={event.id}
        eventSlug={event.slug}
        eventStatus={event.status === "CANCELLED" ? "CANCELLED" : "ACTIVE"}
        organizerName={user.name}
        initialValues={initialValues}
      />
    </div>
  );
}
