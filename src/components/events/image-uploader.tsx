"use client";

import { useId, useRef, useState } from "react";
import { AlertCircle, Camera, ImagePlus, Loader2, X } from "lucide-react";
import { EventImage } from "@/components/events/event-image";
import { ALLOWED_IMAGE_TYPES, MAX_EVENT_IMAGES, MAX_IMAGE_BYTES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const MAX_MB = Math.round((MAX_IMAGE_BYTES / (1024 * 1024)) * 10) / 10;
const ACCEPT = ALLOWED_IMAGE_TYPES.join(",");

type UploadResponse = {
  ok?: boolean;
  url?: string;
  error?: string;
};

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
    xhr.onabort = () => reject(new Error("Envio cancelado."));

    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}

function validateFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Formato não permitido. Envie JPG, PNG, WebP ou AVIF.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `A imagem excede o limite de ${MAX_MB} MB.`;
  }
  return null;
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label="Progresso do envio da imagem"
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light transition-[width] duration-200"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function DropSurface({
  busy,
  onFiles,
  inputId,
  children,
  className,
}: {
  busy: boolean;
  onFiles: (files: FileList | null) => void;
  inputId: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!busy) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        if (!busy) onFiles(event.dataTransfer.files);
      }}
      className={cn(
        "relative rounded-2xl border border-dashed transition",
        dragging
          ? "border-brand-light/70 bg-brand/10"
          : "border-white/12 bg-white/[0.025] hover:border-brand/40 hover:bg-white/[0.04]",
        className,
      )}
    >
      <label
        htmlFor={inputId}
        className={cn(
          "flex h-full w-full cursor-pointer flex-col items-center justify-center gap-2 px-4 py-6 text-center",
          busy && "pointer-events-none opacity-60",
        )}
      >
        {children}
      </label>
    </div>
  );
}

export function CoverUploader({
  value,
  onChange,
  error,
  onBusyChange,
}: {
  value: string;
  onChange: (url: string) => void;
  error?: string;
  onBusyChange?: (busy: boolean) => void;
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
    <div className="space-y-2">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />

      {value ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/10">
          <div className="relative aspect-[16/10] w-full bg-night-3">
            <EventImage
              src={value}
              alt="Prévia da imagem de capa do evento"
              fill
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-cover"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/80 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-3">
              <span className="rounded-full border border-white/15 bg-night/70 px-3 py-1 text-[0.68rem] font-semibold text-fog backdrop-blur">
                Imagem de capa
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={busy}
                  className="rounded-full border border-white/15 bg-night/70 px-3 py-1.5 text-[0.68rem] font-semibold text-fog backdrop-blur transition hover:border-brand-light/50 hover:text-brand-light disabled:opacity-50"
                >
                  Trocar
                </button>
                <button
                  type="button"
                  onClick={() => onChange("")}
                  disabled={busy}
                  aria-label="Remover imagem de capa"
                  className="rounded-full border border-white/15 bg-night/70 p-1.5 text-fog backdrop-blur transition hover:border-red-400/50 hover:text-red-300 disabled:opacity-50"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
          {busy ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-night/80 px-6 backdrop-blur-sm">
              <Loader2 className="size-6 animate-spin text-brand-light" aria-hidden="true" />
              <div className="w-full max-w-48">
                <ProgressBar value={progress} />
              </div>
              <span className="text-xs text-ash">Enviando {progress}%</span>
            </div>
          ) : null}
        </div>
      ) : (
        <DropSurface busy={busy} onFiles={handleFiles} inputId={inputId} className="aspect-[16/10]">
          {busy ? (
            <>
              <Loader2 className="size-6 animate-spin text-brand-light" aria-hidden="true" />
              <span className="text-sm font-semibold text-fog">Enviando {progress}%</span>
              <div className="w-full max-w-52">
                <ProgressBar value={progress} />
              </div>
            </>
          ) : (
            <>
              <span className="flex size-11 items-center justify-center rounded-full border border-brand/30 bg-brand/10 text-brand-light">
                <Camera className="size-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-semibold text-fog">Adicionar imagem de capa</span>
              <span className="text-xs text-ash">
                Arraste e solte ou clique para escolher
              </span>
              <span className="text-[0.68rem] text-ash/70">
                JPG, PNG, WebP ou AVIF · até {MAX_MB} MB
              </span>
            </>
          )}
        </DropSurface>
      )}

      {uploadError || error ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-red-300">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {uploadError ?? error}
        </p>
      ) : null}
    </div>
  );
}

export function GalleryUploader({
  value,
  onChange,
  error,
  onBusyChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  error?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const remaining = Math.max(0, MAX_EVENT_IMAGES - value.length);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const queue = Array.from(files).slice(0, remaining);
    if (queue.length === 0) {
      setUploadError(`Você já adicionou o máximo de ${MAX_EVENT_IMAGES} fotos.`);
      return;
    }

    for (const file of queue) {
      const problem = validateFile(file);
      if (problem) {
        setUploadError(problem);
        return;
      }
    }

    setUploadError(null);
    setBusy(true);
    onBusyChange?.(true);

    const uploaded: string[] = [];
    try {
      for (const [index, file] of queue.entries()) {
        setProgress(0);
        const url = await uploadFile(file, (fileProgress) => {
          const overall = Math.round(((index + fileProgress / 100) / queue.length) * 100);
          setProgress(overall);
        });
        uploaded.push(url);
      }
      onChange([...value, ...uploaded].slice(0, MAX_EVENT_IMAGES));
    } catch (reason) {
      if (uploaded.length > 0) onChange([...value, ...uploaded].slice(0, MAX_EVENT_IMAGES));
      setUploadError(reason instanceof Error ? reason.message : "Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        onChange={(event) => void handleFiles(event.target.files)}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {value.map((url) => (
          <div
            key={url}
            className="group relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-night-3"
          >
            <EventImage
              src={url}
              alt="Prévia de foto da galeria do evento"
              fill
              sizes="(max-width: 640px) 45vw, 180px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((item) => item !== url))}
              aria-label="Remover foto da galeria"
              className="absolute right-1.5 top-1.5 rounded-full border border-white/20 bg-night/80 p-1.5 text-fog backdrop-blur transition hover:border-red-400/60 hover:text-red-300"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}

        {remaining > 0 ? (
          <DropSurface
            busy={busy}
            onFiles={handleFiles}
            inputId={inputId}
            className="aspect-square"
          >
            {busy ? (
              <>
                <Loader2 className="size-5 animate-spin text-brand-light" aria-hidden="true" />
                <span className="text-xs font-semibold text-fog">{progress}%</span>
                <div className="w-full max-w-28">
                  <ProgressBar value={progress} />
                </div>
              </>
            ) : (
              <>
                <ImagePlus className="size-5 text-brand-light" aria-hidden="true" />
                <span className="text-xs font-semibold text-fog">Adicionar fotos</span>
                <span className="text-[0.66rem] text-ash">
                  {remaining} {remaining === 1 ? "vaga" : "vagas"}
                </span>
              </>
            )}
          </DropSurface>
        ) : null}
      </div>

      <p className="text-[0.68rem] text-ash/80">
        {value.length} de {MAX_EVENT_IMAGES} fotos · JPG, PNG, WebP ou AVIF até {MAX_MB} MB cada
      </p>

      {uploadError || error ? (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-red-300">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {uploadError ?? error}
        </p>
      ) : null}
    </div>
  );
}
