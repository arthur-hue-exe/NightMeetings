import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre na sua conta MotorMeetings para gerenciar seus encontros de motos.",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
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
      eyebrow="Bem-vindo de volta"
      title={
        <>
          Entre e <span className="text-gradient">acelere.</span>
        </>
      }
      description="Acesse sua conta para acompanhar seus eventos, editar informações e organizar o próximo rolê."
    >
      <AuthForm mode="login" next={next} />
    </AuthShell>
  );
}
