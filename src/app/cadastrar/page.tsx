import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Criar conta",
  description:
    "Crie sua conta gratuita no MotorMeetings e publique encontros de motos em Goiânia e região.",
  robots: { index: false, follow: false },
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawNext = Array.isArray(params.next) ? params.next[0] : params.next;
  const next = safeNextPath(rawNext);
  const user = await getCurrentUser();
  if (user) redirect(next);

  return (
    <AuthShell
      eyebrow="Crie sua conta"
      title={
        <>
          Seu próximo <span className="text-gradient">rolê</span> começa aqui.
        </>
      }
      description="Em menos de um minuto você cria sua conta e já pode publicar encontros e se conectar com a comunidade."
    >
      <AuthForm mode="register" next={next} />
    </AuthShell>
  );
}
