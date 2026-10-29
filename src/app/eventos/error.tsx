"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

export default function EventsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="shell flex min-h-[60svh] flex-col items-center justify-center py-28 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 text-red-300">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </span>
      <h1 className="display mt-5 text-4xl text-fog">Não foi possível carregar os eventos</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ash">
        Ocorreu um erro ao consultar o catálogo. Tente novamente — se persistir, volte em instantes.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button type="button" onClick={reset} variant="primary" size="md">
          <RotateCcw className="size-4" aria-hidden="true" />
          Tentar novamente
        </Button>
        <ButtonLink href="/" variant="secondary" size="md">
          Voltar ao início
        </ButtonLink>
      </div>
    </div>
  );
}
