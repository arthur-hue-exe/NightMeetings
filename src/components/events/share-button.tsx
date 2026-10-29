"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShareEventButton({
  title,
  text,
  path,
}: {
  title: string;
  text?: string;
  path: string;
}) {
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function copyLink() {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setMessage("Link copiado!");
      window.setTimeout(() => {
        setCopied(false);
        setMessage(null);
      }, 2600);
    } catch {
      setMessage("Não foi possível copiar. Selecione o endereço no navegador.");
    }
  }

  async function share() {
    const url = `${window.location.origin}${path}`;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text: text ?? title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyLink();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={share} variant="primary" size="md" className="flex-1">
          <Share2 className="size-4" aria-hidden="true" />
          Compartilhar
        </Button>
        <Button type="button" onClick={copyLink} variant="secondary" size="md" className="flex-1">
          {copied ? <Check className="size-4 text-emerald-400" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? "Copiado" : "Copiar link"}
        </Button>
      </div>
      <p className="min-h-4 text-center text-[0.7rem] text-ash" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
