import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EventForm } from "@/components/events/event-form";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Criar evento",
  description: "Publique seu encontro de motos em Goiânia e região metropolitana.",
  robots: { index: false, follow: false },
};

export default async function CreateEventPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/entrar?next=${encodeURIComponent("/eventos/criar")}`);
  }

  return (
    <div className="shell pb-14 pt-28">
      <EventForm mode="create" organizerName={user.name} />
    </div>
  );
}
