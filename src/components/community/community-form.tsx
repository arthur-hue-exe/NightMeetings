"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { SquareImageUploader } from "@/components/community/square-image-uploader";
import { CITY_SUGGESTIONS, COMMUNITY_CATEGORIES } from "@/lib/constants";

type CommunityValues = {
  name: string;
  description: string;
  city: string;
  category: string;
  emblemUrl: string;
  whatsappInviteUrl: string;
};

export function CommunityForm({
  mode,
  communityId,
  initial,
}: {
  mode: "create" | "edit";
  communityId?: string;
  initial?: Partial<CommunityValues>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<CommunityValues>({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    city: initial?.city ?? "",
    category: initial?.category ?? "OUTROS",
    emblemUrl: initial?.emblemUrl ?? "",
    whatsappInviteUrl: initial?.whatsappInviteUrl ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  function update<K extends keyof CommunityValues>(key: K, value: CommunityValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || uploading) return;
    setBusy(true);
    setError(null);
    setErrors({});

    try {
      const endpoint = mode === "create" ? "/api/communities" : `/api/communities/${communityId}`;
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        community?: { slug?: string };
        error?: string;
        fieldErrors?: Record<string, string>;
      };

      if (!response.ok || !data.ok) {
        setErrors(data.fieldErrors ?? {});
        throw new Error(data.error || "Não foi possível salvar a comunidade.");
      }

      const slug = data.community?.slug;
      router.push(slug ? `/comunidade/${slug}` : "/comunidade");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível salvar a comunidade.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="panel space-y-5 rounded-3xl p-5 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome da comunidade" error={errors.name} htmlFor="community-name">
          <input
            id="community-name"
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            maxLength={60}
            required
            placeholder="Ex.: Rocket Riders Goiânia"
            className={inputClass(errors.name)}
          />
        </Field>

        <Field label="Categoria" error={errors.category} htmlFor="community-category">
          <select
            id="community-category"
            value={values.category}
            onChange={(event) => update("category", event.target.value)}
            className={inputClass(errors.category)}
          >
            {COMMUNITY_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Cidade ou região (opcional)"
          error={errors.city}
          htmlFor="community-city"
          hint="Ajuda outras pessoas a encontrarem o grupo."
        >
          <input
            id="community-city"
            value={values.city}
            onChange={(event) => update("city", event.target.value)}
            maxLength={60}
            list="community-cities"
            placeholder="Goiânia"
            className={inputClass(errors.city)}
          />
          <datalist id="community-cities">
            {CITY_SUGGESTIONS.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </Field>

        <div className="sm:col-span-2">
          <Field
            label="Convite do WhatsApp"
            error={errors.whatsappInviteUrl}
            htmlFor="community-whatsapp"
            hint="Apenas links oficiais do tipo https://chat.whatsapp.com/… gerados pelo próprio WhatsApp."
          >
            <input
              id="community-whatsapp"
              value={values.whatsappInviteUrl}
              onChange={(event) => update("whatsappInviteUrl", event.target.value)}
              maxLength={300}
              required
              inputMode="url"
              placeholder="https://chat.whatsapp.com/..."
              className={inputClass(errors.whatsappInviteUrl)}
            />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Descrição (opcional)" error={errors.description} htmlFor="community-description">
            <textarea
              id="community-description"
              value={values.description}
              onChange={(event) => update("description", event.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Conte quem é o grupo, quando se encontram e qual é a vibe."
              className={inputClass(errors.description)}
            />
          </Field>
          <p className="mt-1 text-right text-[0.66rem] text-ash/60">{values.description.length}/500</p>
        </div>

        <div className="sm:col-span-2">
          <p className="mb-2 text-xs font-semibold text-ash">
            Emblema da comunidade <span className="text-brand-light">*</span>
          </p>
          <SquareImageUploader
            value={values.emblemUrl}
            onChange={(url) => update("emblemUrl", url)}
            onBusyChange={setUploading}
            label="emblema da comunidade"
            error={errors.emblemUrl}
            hint="Prefira uma imagem quadrada. O emblema é obrigatório."
          />
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-xs leading-relaxed text-ash">
        Ao publicar, o link de convite ficará visível na página pública da comunidade. O MotorMeetings
        não cria nem valida a existência do grupo no WhatsApp — use apenas convites oficiais.
      </div>

      {error ? (
        <p role="alert" className="flex items-center gap-1.5 text-sm text-red-300">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" /> {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Link
          href={mode === "edit" ? "/comunidade" : "/comunidade?aba=grupos"}
          className="text-sm font-semibold text-ash transition hover:text-fog"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={busy || uploading}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-light px-6 py-2.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {busy ? "Salvando…" : mode === "create" ? "Publicar comunidade" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}

function inputClass(error?: string) {
  return [
    "mt-1 w-full rounded-xl border bg-night-3/60 px-3.5 py-2.5 text-sm text-fog placeholder:text-ash/50 focus:outline-none",
    error ? "border-red-400/60" : "border-white/12 focus:border-brand-light/50",
  ].join(" ");
}

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-ash">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-[0.66rem] text-ash/60">{hint}</p> : null}
      {error ? (
        <p role="alert" className="mt-1 flex items-center gap-1 text-[0.66rem] text-red-300">
          <AlertCircle className="size-3 shrink-0" aria-hidden="true" /> {error}
        </p>
      ) : null}
    </div>
  );
}
