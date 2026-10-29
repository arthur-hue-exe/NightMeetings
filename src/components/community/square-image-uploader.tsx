"use client";

import { useId, useRef, useState } from "react";
import { AlertCircle, ImagePlus, Loader2, X } from "lucide-react";
import { EventImage } from "@/components/events/event-image";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const MAX_MB = Math.round((MAX_IMAGE_BYTES / (1024 * 1024)) * 10) / 10;
const ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

type UploadResponse = { ok?: boolean; url?: string; error?: string };

function validateFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Formato não permitido. Envie JPG, PNG, WebP ou AVIF.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `A imagem excede o limite de ${MAX_MB} MB.`;
  }
  return null;
}

function uploadFile(file: File, onProgress: (value: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      const data = (xhr.response ?? {}) as UploadResponse;
      if (xhr.status >= 200 && xhr.status < 300 && data.url) {
        resolve(data.url);
        return;
      }
      reject(new Error(data.error || "Não foi possível enviar a imagem."));
    };
    xhr.onerror = () => reject(new Error("Falha de conexão ao enviar a imagem."));
    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}

export function SquareImageUploader({
  value,
  onChange,
  label,
  hint,
  error,
  onBusyChange,
  className,
}: {
  value: string;
  onChange: (url: string) => void;
  label: string;
  hint?: string;
  error?: string;
  onBusyChange?: (busy: boolean) => void;
  className?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const problem = validateFile(file);
    if (problem) {
      setUploadError(problem);
      return;
    }

    setUploadError(null);
    setBusy(true);
    setProgress(0);
    onBusyChange?.(true);
    try {
      const url = await uploadFile(file, setProgress);
      onChange(url);
    } catch (reason) {
      setUploadError(reason instanceof Error ? reason.message : "Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />

      <div className="flex items-start gap-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl border border-white/12 bg-night-3">
          {value ? (
            <EventImage
              src={value}
              alt={`Prévia de ${label.toLowerCase()}`}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-ash/60" aria-hidden="true">
              <ImagePlus className="size-6" />
            </div>
          )}
          {busy ? (
            <div className="absolute inset-0 flex items-center justify-center bg-night/80">
              <Loader2 className="size-5 animate-spin text-brand-light" aria-hidden="true" />
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-full border border-white/12 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-fog transition hover:border-brand-light/45 hover:bg-white/[0.07] disabled:opacity-50"
            >
              {value ? "Trocar imagem" : "Enviar imagem"}
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange("")}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-ash transition hover:border-red-400/50 hover:text-red-300 disabled:opacity-50"
              >
                <X className="size-3" aria-hidden="true" /> Remover
              </button>
            ) : null}
          </div>

          <p className="text-[0.7rem] leading-relaxed text-ash/80">
            JPG, PNG, WebP ou AVIF · até {MAX_MB} MB. {hint}
          </p>

          {busy ? (
            <div
              className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Progresso do envio da imagem"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light transition-[width] duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {uploadError || error ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-red-300">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {uploadError ?? error}
        </p>
      ) : null}
    </div>
  );
}
