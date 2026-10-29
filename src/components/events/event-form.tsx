"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, type Path, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Instagram,
  Loader2,
  MapPin,
  Navigation,
  PartyPopper,
  Route,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { CategoryIcon } from "@/components/events/category-icon";
import { CoverUploader, GalleryUploader } from "@/components/events/image-uploader";
import { EventImage } from "@/components/events/event-image";
import { RouteTimeline } from "@/components/events/route-timeline";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import {
  CITY_SUGGESTIONS,
  EVENT_CATEGORIES,
  MAX_EVENT_IMAGES,
  getCategoryLabel,
} from "@/lib/constants";
import {
  formatDate,
  formatDateLong,
  formatMonthShort,
  formatDay,
  formatWeekdayShort,
  getTodayISO,
} from "@/lib/dates";
import { eventSchema, type EventInput } from "@/lib/validation";
import { absoluteUrl, cn } from "@/lib/utils";

export type EventFormValues = EventInput;

const STEP_TITLES = [
  { title: "O encontro", eyebrow: "Passo 1" },
  { title: "Local e rota", eyebrow: "Passo 2" },
  { title: "Detalhes", eyebrow: "Passo 3" },
  { title: "Revisão", eyebrow: "Passo 4" },
] as const;

const STEP_FIELDS: Path<EventFormValues>[][] = [
  ["title", "category", "city", "eventDate", "startTime", "endDate"],
  [
    "meetingPoint",
    "departurePoint",
    "departureTime",
    "arrivalPoint",
    "arrivalDate",
    "arrivalTime",
    "routeNotes",
  ],
  ["description", "rules", "additionalInfo", "contactInstagram", "coverImageUrl", "images"],
  [],
];

function baseValues(): EventFormValues {
  return {
    title: "",
    category: EVENT_CATEGORIES[0]!.value,
    city: "Goiânia",
    eventDate: "",
    startTime: "",
    endDate: "",
    meetingPoint: "",
    description: "",
    departurePoint: "",
    departureTime: "",
    arrivalPoint: "",
    arrivalDate: "",
    arrivalTime: "",
    routeNotes: "",
    rules: "",
    additionalInfo: "",
    contactInstagram: "",
    coverImageUrl: "",
    images: [],
  };
}

function scrollToTop() {
  const target = document.getElementById("evento-form-top");
  if (!target) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

type ApiResult = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  event?: { id: string; slug: string };
};

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setFailed(false);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={url}
          aria-label="Link público do evento"
          onFocus={(event) => event.currentTarget.select()}
          className="h-11 w-full rounded-xl border border-white/10 bg-night-3/70 px-3.5 text-sm text-ash"
        />
        <Button type="button" variant="secondary" onClick={() => void handleCopy()} className="shrink-0">
          {copied ? (
            <>
              <Check className="size-4" aria-hidden="true" /> Copiado
            </>
          ) : (
            <>
              <Copy className="size-4" aria-hidden="true" /> Copiar link
            </>
          )}
        </Button>
      </div>
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copiado." : ""}
      </span>
      {failed ? (
        <p className="text-xs text-ash">Não foi possível copiar automaticamente. Selecione o link acima.</p>
      ) : null}
    </div>
  );
}

function ReviewRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 border-b border-white/6 py-3 last:border-0">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-light/80" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ash">{label}</p>
        <div className="mt-0.5 text-sm text-fog">{children}</div>
      </div>
    </div>
  );
}

export function EventForm({
  mode,
  eventId,
  eventSlug,
  eventStatus,
  organizerName,
  initialValues,
}: {
  mode: "create" | "edit";
  eventId?: string;
  eventSlug?: string;
  eventStatus?: "ACTIVE" | "CANCELLED";
  organizerName?: string;
  initialValues?: Partial<EventFormValues>;
}) {
  const router = useRouter();
  const defaults = { ...baseValues(), ...initialValues };
  const [step, setStep] = useState(0);
  const [routeEnabled, setRouteEnabled] = useState(
    Boolean(
      defaults.departurePoint ||
        defaults.departureTime ||
        defaults.arrivalPoint ||
        defaults.arrivalTime ||
        defaults.routeNotes,
    ),
  );
  const [multiDay, setMultiDay] = useState(Boolean(defaults.endDate));
  const [stepError, setStepError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [galleryBusy, setGalleryBusy] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema) as Resolver<EventFormValues>,
    defaultValues: defaults,
    mode: "onTouched",
  });

  const formValues = watch();
  const today = getTodayISO();
  const uploading = coverBusy || galleryBusy;

  useEffect(() => {
    if (!saved) return;
    const timeout = window.setTimeout(() => setSaved(false), 6000);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  useEffect(() => {
    if (createdSlug) scrollToTop();
  }, [createdSlug]);

  async function goNext() {
    const valid = await trigger(STEP_FIELDS[step]!);
    if (!valid) {
      setStepError("Revise os campos destacados nesta etapa antes de continuar.");
      return;
    }
    setStepError(null);
    setStep(Math.min(STEP_TITLES.length - 1, step + 1));
    scrollToTop();
  }

  function goBack() {
    setStepError(null);
    setStep(Math.max(0, step - 1));
    scrollToTop();
  }

  function toggleRoute(enabled: boolean) {
    setRouteEnabled(enabled);
    if (!enabled) {
      setValue("departurePoint", "");
      setValue("departureTime", "");
      setValue("arrivalPoint", "");
      setValue("arrivalDate", "");
      setValue("arrivalTime", "");
      setValue("routeNotes", "");
    }
  }

  function toggleMultiDay(enabled: boolean) {
    setMultiDay(enabled);
    if (!enabled) setValue("endDate", "");
    else if (!watch("endDate")) setValue("endDate", watch("eventDate"));
  }

  function handleServerFieldErrors(fieldErrors: Record<string, string>) {
    let firstStep = -1;
    for (const [field, message] of Object.entries(fieldErrors)) {
      setError(field as Path<EventFormValues>, { type: "server", message });
      const index = STEP_FIELDS.findIndex((fields) =>
        (fields as string[]).includes(field),
      );
      if (index >= 0 && (firstStep === -1 || index < firstStep)) firstStep = index;
    }
    if (firstStep > 0) setStep(firstStep);
  }

  async function onValid(data: EventFormValues) {
    setServerError(null);
    setNeedsAuth(false);
    setStepError(null);

    try {
      const response = await fetch(
        mode === "create" ? "/api/events" : `/api/events/${eventId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            endDate: multiDay ? data.endDate : "",
          }),
        },
      );

      const payload = (await response.json().catch(() => ({}))) as ApiResult;

      if (response.status === 401) {
        setNeedsAuth(true);
        setServerError("Sua sessão expirou. Entre novamente para continuar.");
        return;
      }

      if (!response.ok) {
        if (payload.fieldErrors) handleServerFieldErrors(payload.fieldErrors);
        setServerError(payload.error ?? "Não foi possível salvar o evento. Tente novamente.");
        return;
      }

      if (mode === "create") {
        const slug = payload.event?.slug;
        if (!slug) {
          setServerError("O evento foi salvo, mas não foi possível abrir a página. Acesse Meus eventos.");
          return;
        }
        setCreatedSlug(slug);
        scrollToTop();
      } else {
        setSaved(true);
        router.refresh();
        scrollToTop();
      }
    } catch {
      setServerError("Falha de conexão. Verifique sua internet e tente novamente.");
    }
  }

  if (createdSlug) {
    const publicUrl = absoluteUrl(`/eventos/${createdSlug}`);
    return (
      <div className="panel mx-auto max-w-2xl rounded-[2rem] p-6 sm:p-10">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-4xl tracking-wide text-fog sm:text-5xl">
          Evento publicado!
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ash">
          Sua página pública já está no ar. Compartilhe o link com a galera e acompanhe tudo em
          Meus eventos.
        </p>

        <div className="mt-6 rounded-2xl border border-white/8 bg-night-3/50 p-4">
          <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-ash">
            Link do evento
          </p>
          <div className="mt-2">
            <CopyLink url={publicUrl} />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={`/eventos/${createdSlug}`} variant="primary" size="lg">
            Ver página do evento
            <ExternalLink className="size-4" aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href="/meus-eventos" variant="secondary" size="lg">
            Ir para Meus eventos
          </ButtonLink>
        </div>
        <p className="mt-4 text-xs text-ash">
          Quer organizar outro rolê?{" "}
          <Link href="/eventos/criar" className="font-semibold text-brand-light hover:text-brand">
            Criar novo evento
          </Link>
          .
        </p>
      </div>
    );
  }

  const isReview = step === STEP_TITLES.length - 1;
  const cover = formValues.coverImageUrl;
  const hasRoute = routeEnabled && Boolean(formValues.departurePoint);

  return (
    <div id="evento-form-top" className="mx-auto max-w-5xl scroll-mt-28">
      <form onSubmit={handleSubmit(onValid)} noValidate>
        <div className="panel overflow-hidden rounded-[2rem]">
          <div className="border-b border-white/8 px-5 py-5 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">{mode === "create" ? "Publicar" : "Editar"}</p>
                <h1 className="display mt-1.5 text-4xl text-fog sm:text-5xl">
                  {mode === "create" ? "Criar meu evento" : "Editar evento"}
                </h1>
              </div>
              <Badge tone="neutral">
                <ShieldCheck className="size-3" aria-hidden="true" />
                {mode === "create" ? "Publicação gratuita" : "Somente você pode editar"}
              </Badge>
            </div>

            {mode === "edit" && eventStatus === "CANCELLED" ? (
              <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                Este evento está cancelado. Você pode editar as informações, mas ele continua
                cancelado até ser reativado em Meus eventos.
              </div>
            ) : null}

            <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Etapas do formulário">
              {STEP_TITLES.map((item, index) => {
                const active = index === step;
                const done = index < step;
                return (
                  <li key={item.title}>
                    <button
                      type="button"
                      onClick={() => {
                        if (index <= step) {
                          setStep(index);
                          setStepError(null);
                          scrollToTop();
                        }
                      }}
                      disabled={index > step}
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition",
                        active
                          ? "border-brand/50 bg-brand/12 text-fog"
                          : done
                            ? "border-white/10 bg-white/[0.04] text-ash hover:border-brand/35 hover:text-fog"
                            : "cursor-default border-white/6 text-ash/45",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-extrabold",
                          active
                            ? "bg-gradient-to-br from-brand to-brand-light text-white"
                            : done
                              ? "bg-brand/20 text-brand-light"
                              : "bg-white/6 text-ash",
                        )}
                      >
                        {done ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                      </span>
                      <span className="truncate text-xs font-semibold">{item.title}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light transition-[width] duration-500"
                style={{ width: `${(step / (STEP_TITLES.length - 1)) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-5 sm:p-8">
            {serverError ? (
              <div className="mb-5">
                <FormError>
                  {serverError}
                  {needsAuth ? (
                    <>
                      {" "}
                      <Link
                        href={`/entrar?next=${encodeURIComponent(
                          mode === "create" ? "/eventos/criar" : `/eventos/${eventSlug}/editar`,
                        )}`}
                        className="font-semibold text-white underline underline-offset-2"
                      >
                        Entrar agora
                      </Link>
                    </>
                  ) : null}
                </FormError>
              </div>
            ) : null}

            {saved && mode === "edit" ? (
              <div
                role="status"
                className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
              >
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Alterações salvas com sucesso.
                </span>
                {eventSlug ? (
                  <Link
                    href={`/eventos/${eventSlug}`}
                    className="font-semibold text-white underline underline-offset-2"
                  >
                    Ver página pública
                  </Link>
                ) : null}
              </div>
            ) : null}

            {stepError ? (
              <div className="mb-5">
                <FormError>{stepError}</FormError>
              </div>
            ) : null}

            {step === 0 ? (
              <div className="space-y-6">
                <div>
                  <Field
                    label="Nome do evento"
                    htmlFor="title"
                    required
                    error={errors.title?.message}
                    hint={`${formValues.title.length}/90`}
                  >
                    <Input
                      id="title"
                      placeholder="Ex.: Rolê Noturno da Serra"
                      autoComplete="off"
                      aria-invalid={Boolean(errors.title)}
                      aria-describedby={errors.title ? "title-error" : undefined}
                      maxLength={90}
                      {...register("title")}
                    />
                  </Field>
                </div>

                <div>
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-ash">
                    Categoria <span className="text-brand-light">*</span>
                  </p>
                  <div
                    role="radiogroup"
                    aria-label="Categoria do evento"
                    className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
                  >
                    {EVENT_CATEGORIES.map((category) => {
                      const selected = formValues.category === category.value;
                      return (
                        <button
                          key={category.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() =>
                            setValue("category", category.value, {
                              shouldValidate: true,
                              shouldDirty: true,
                            })
                          }
                          className={cn(
                            "flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition",
                            selected
                              ? "border-brand/60 bg-brand/12 text-fog shadow-[0_0_24px_-10px_rgba(128,0,255,0.8)]"
                              : "border-white/8 bg-white/[0.025] text-ash hover:border-brand/35 hover:text-fog",
                          )}
                        >
                          <CategoryIcon
                            value={category.value}
                            className={cn("size-4", selected ? "text-brand-light" : "text-ash/70")}
                          />
                          <span className="text-xs font-semibold leading-tight">
                            {category.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.category ? (
                    <p className="mt-1.5 text-xs text-red-300" role="alert">
                      {errors.category.message}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Cidade" htmlFor="city" required error={errors.city?.message}>
                    <Input
                      id="city"
                      list="city-suggestions"
                      placeholder="Goiânia"
                      autoComplete="address-level2"
                      aria-invalid={Boolean(errors.city)}
                      aria-describedby={errors.city ? "city-error" : undefined}
                      {...register("city")}
                    />
                    <datalist id="city-suggestions">
                      {CITY_SUGGESTIONS.map((city) => (
                        <option key={city} value={city} />
                      ))}
                    </datalist>
                  </Field>

                  <Field
                    label="Data do evento"
                    htmlFor="eventDate"
                    required
                    error={errors.eventDate?.message}
                  >
                    <Input
                      id="eventDate"
                      type="date"
                      min={today}
                      aria-invalid={Boolean(errors.eventDate)}
                      aria-describedby={errors.eventDate ? "eventDate-error" : undefined}
                      {...register("eventDate")}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Horário de início"
                    htmlFor="startTime"
                    required
                    hint="Formato 24h"
                    error={errors.startTime?.message}
                  >
                    <Input
                      id="startTime"
                      type="time"
                      step={300}
                      aria-invalid={Boolean(errors.startTime)}
                      aria-describedby={errors.startTime ? "startTime-error" : undefined}
                      {...register("startTime")}
                    />
                  </Field>
                </div>

                <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={multiDay}
                      onChange={(event) => toggleMultiDay(event.target.checked)}
                      className="mt-0.5 size-4 shrink-0 accent-[#8000ff]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-fog">
                        O evento dura mais de um dia
                      </span>
                      <span className="block text-xs text-ash">
                        Opcional. O evento continua visível até o fim da data final.
                      </span>
                    </span>
                  </label>
                  {multiDay ? (
                    <div className="mt-3 max-w-xs">
                      <Field label="Data final" htmlFor="endDate" error={errors.endDate?.message}>
                        <Input
                          id="endDate"
                          type="date"
                          min={formValues.eventDate || today}
                          aria-invalid={Boolean(errors.endDate)}
                          aria-describedby={errors.endDate ? "endDate-error" : undefined}
                          {...register("endDate")}
                        />
                      </Field>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-6">
                <div>
                  <Field
                    label="Ponto de encontro"
                    htmlFor="meetingPoint"
                    required
                    error={errors.meetingPoint?.message}
                  >
                    <Input
                      id="meetingPoint"
                      placeholder="Endereço ou referência conhecida"
                      aria-invalid={Boolean(errors.meetingPoint)}
                      aria-describedby={errors.meetingPoint ? "meetingPoint-error" : undefined}
                      {...register("meetingPoint")}
                    />
                  </Field>
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-ash">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-brand-light/70" aria-hidden="true" />
                    Use um ponto fácil de achar. O link do Google Maps é gerado a partir deste texto.
                  </p>
                </div>

                <div className="rounded-xl border border-white/8 bg-white/[0.025] p-4">
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      checked={routeEnabled}
                      onChange={(event) => toggleRoute(event.target.checked)}
                      className="mt-0.5 size-4 shrink-0 accent-[#8000ff]"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-fog">
                        Este evento tem trajeto / destino
                      </span>
                      <span className="block text-xs text-ash">
                        Adicione saída e chegada para montar a linha do tempo do roteiro.
                      </span>
                    </span>
                  </label>
                </div>

                {routeEnabled ? (
                  <div className="space-y-5">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Ponto de saída"
                        htmlFor="departurePoint"
                        error={errors.departurePoint?.message}
                      >
                        <Input
                          id="departurePoint"
                          placeholder="De onde o grupo sai"
                          aria-invalid={Boolean(errors.departurePoint)}
                          aria-describedby={
                            errors.departurePoint ? "departurePoint-error" : undefined
                          }
                          {...register("departurePoint")}
                        />
                      </Field>
                      <Field
                        label="Horário de saída"
                        htmlFor="departureTime"
                        error={errors.departureTime?.message}
                      >
                        <Input
                          id="departureTime"
                          type="time"
                          step={300}
                          aria-invalid={Boolean(errors.departureTime)}
                          aria-describedby={
                            errors.departureTime ? "departureTime-error" : undefined
                          }
                          {...register("departureTime")}
                        />
                      </Field>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Ponto de chegada"
                        htmlFor="arrivalPoint"
                        error={errors.arrivalPoint?.message}
                      >
                        <Input
                          id="arrivalPoint"
                          placeholder="Destino final do trajeto"
                          aria-invalid={Boolean(errors.arrivalPoint)}
                          aria-describedby={errors.arrivalPoint ? "arrivalPoint-error" : undefined}
                          {...register("arrivalPoint")}
                        />
                      </Field>
                      <Field
                        label="Horário de chegada"
                        htmlFor="arrivalTime"
                        error={errors.arrivalTime?.message}
                      >
                        <Input
                          id="arrivalTime"
                          type="time"
                          step={300}
                          aria-invalid={Boolean(errors.arrivalTime)}
                          aria-describedby={errors.arrivalTime ? "arrivalTime-error" : undefined}
                          {...register("arrivalTime")}
                        />
                      </Field>
                    </div>

                    <div className="max-w-xs">
                      <Field
                        label="Data de chegada"
                        htmlFor="arrivalDate"
                        hint="Opcional"
                        error={errors.arrivalDate?.message}
                      >
                        <Input
                          id="arrivalDate"
                          type="date"
                          min={formValues.eventDate || today}
                          aria-invalid={Boolean(errors.arrivalDate)}
                          aria-describedby={errors.arrivalDate ? "arrivalDate-error" : undefined}
                          {...register("arrivalDate")}
                        />
                      </Field>
                      <p className="mt-1.5 text-xs text-ash">
                        Se a chegada for no mesmo dia, deixe em branco. Se atravessar a meia-noite,
                        informe a data seguinte.
                      </p>
                    </div>

                    <Field
                      label="Observações do trajeto"
                      htmlFor="routeNotes"
                      hint="Opcional"
                      error={errors.routeNotes?.message}
                    >
                      <Textarea
                        id="routeNotes"
                        rows={3}
                        placeholder="Ex.: saída em comboio, parada no km 12, ritmo tranquilo."
                        maxLength={2000}
                        aria-invalid={Boolean(errors.routeNotes)}
                        aria-describedby={errors.routeNotes ? "routeNotes-error" : undefined}
                        {...register("routeNotes")}
                      />
                    </Field>
                  </div>
                ) : null}

                <p className="flex items-start gap-2 rounded-xl border border-white/8 bg-night-3/40 px-4 py-3 text-xs leading-relaxed text-ash">
                  <Route className="mt-0.5 size-4 shrink-0 text-brand-light/70" aria-hidden="true" />
                  A plataforma não calcula distâncias nem tempos de viagem. Informe apenas pontos e
                  horários reais do seu roteiro.
                </p>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-6">
                <Field
                  label="Descrição do evento"
                  htmlFor="description"
                  hint={`${formValues.description.length}/4000`}
                  error={errors.description?.message}
                >
                  <Textarea
                    id="description"
                    rows={5}
                    placeholder="Conte como será o encontro, o clima, o que levar e para quem é."
                    maxLength={4000}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={errors.description ? "description-error" : undefined}
                    {...register("description")}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Regras do evento"
                    htmlFor="rules"
                    hint="Opcional"
                    error={errors.rules?.message}
                  >
                    <Textarea
                      id="rules"
                      rows={4}
                      placeholder="Ex.: uso obrigatório de capacete, respeito ao próximo."
                      maxLength={2000}
                      aria-invalid={Boolean(errors.rules)}
                      aria-describedby={errors.rules ? "rules-error" : undefined}
                      {...register("rules")}
                    />
                  </Field>
                  <Field
                    label="Informações adicionais"
                    htmlFor="additionalInfo"
                    hint="Opcional"
                    error={errors.additionalInfo?.message}
                  >
                    <Textarea
                      id="additionalInfo"
                      rows={4}
                      placeholder="Ex.: estacionamento no local, ponto de apoio, contribuição."
                      maxLength={2000}
                      aria-invalid={Boolean(errors.additionalInfo)}
                      aria-describedby={
                        errors.additionalInfo ? "additionalInfo-error" : undefined
                      }
                      {...register("additionalInfo")}
                    />
                  </Field>
                </div>

                <Field
                  label="Instagram do evento"
                  htmlFor="contactInstagram"
                  hint="Opcional · público"
                  error={errors.contactInstagram?.message}
                >
                  <div className="relative">
                    <Instagram
                      className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ash/60"
                      aria-hidden="true"
                    />
                    <Input
                      id="contactInstagram"
                      placeholder="@seuinsta ou link completo"
                      className="pl-10"
                      autoComplete="off"
                      aria-invalid={Boolean(errors.contactInstagram)}
                      aria-describedby={
                        errors.contactInstagram ? "contactInstagram-error" : undefined
                      }
                      {...register("contactInstagram")}
                    />
                  </div>
                </Field>

                <div className="grid gap-6 border-t border-white/8 pt-6 lg:grid-cols-2">
                  <div>
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-ash">
                      Imagem de capa
                    </p>
                    <p className="mb-2 mt-1 text-xs text-ash/80">
                      A capa aparece nos cards e no compartilhamento.
                    </p>
                    <CoverUploader
                      value={formValues.coverImageUrl}
                      onChange={(url) =>
                        setValue("coverImageUrl", url, { shouldDirty: true, shouldValidate: true })
                      }
                      error={errors.coverImageUrl?.message}
                      onBusyChange={setCoverBusy}
                    />
                  </div>
                  <div>
                    <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-ash">
                      Galeria de fotos
                    </p>
                    <p className="mb-2 mt-1 text-xs text-ash/80">
                      Até {MAX_EVENT_IMAGES} fotos do encontro ou do trajeto.
                    </p>
                    <GalleryUploader
                      value={formValues.images ?? []}
                      onChange={(urls) =>
                        setValue("images", urls, { shouldDirty: true, shouldValidate: true })
                      }
                      error={errors.images?.message}
                      onBusyChange={setGalleryBusy}
                    />
                  </div>
                </div>
              </div>
            ) : null}

            {isReview ? (
              <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-5">
                  <div>
                    <p className="eyebrow">Revisão</p>
                    <h2 className="display mt-1.5 text-3xl text-fog sm:text-4xl">
                      Tudo pronto para a rua?
                    </h2>
                    <p className="mt-2 text-sm text-ash">
                      Confira as informações antes de publicar. Você poderá editar depois, enquanto
                      o evento não terminar.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/8 bg-night-3/40 px-4 py-1">
                    <ReviewRow icon={Sparkles} label="Categoria">
                      {getCategoryLabel(formValues.category)}
                    </ReviewRow>
                    <ReviewRow icon={MapPin} label="Encontro">
                      <span className="font-semibold">{formValues.meetingPoint || "—"}</span>
                      <span className="block text-xs text-ash">{formValues.city}</span>
                    </ReviewRow>
                    <ReviewRow icon={CalendarDays} label="Data e horário">
                      {formValues.eventDate ? (
                        <>
                          {formatDateLong(formValues.eventDate)}
                          {formValues.endDate ? ` até ${formatDate(formValues.endDate)}` : ""}
                          <span className="block text-xs text-ash">
                            Início às {formValues.startTime || "—"}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </ReviewRow>
                    {hasRoute ? (
                      <ReviewRow icon={Navigation} label="Rota">
                        <RouteTimeline
                          variant="compact"
                          data={{
                            eventDate: formValues.eventDate,
                            startTime: formValues.startTime,
                            meetingPoint: formValues.meetingPoint,
                            departurePoint: formValues.departurePoint || null,
                            departureTime: formValues.departureTime || null,
                            arrivalPoint: formValues.arrivalPoint || null,
                            arrivalDate: formValues.arrivalDate || null,
                            arrivalTime: formValues.arrivalTime || null,
                          }}
                        />
                      </ReviewRow>
                    ) : null}
                    <ReviewRow icon={Instagram} label="Instagram">
                      {formValues.contactInstagram || "Não informado"}
                    </ReviewRow>
                    <ReviewRow icon={Users} label="Organizador">
                      {organizerName ?? "Você"}
                    </ReviewRow>
                  </div>

                  {formValues.description ? (
                    <div className="rounded-2xl border border-white/8 bg-night-3/40 p-4">
                      <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ash">
                        Descrição
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ash">
                        {formValues.description}
                      </p>
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-brand/25 bg-brand/8 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-fog">
                      <ShieldCheck className="size-4 text-brand-light" aria-hidden="true" />
                      Antes de publicar
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-ash">
                      <li>· Confirme data, horário e ponto de encontro reais.</li>
                      <li>· Não informe distâncias ou tempos que você não conhece.</li>
                      <li>· Sua página pública mostra apenas seu nome de organizador.</li>
                      <li>· O evento sai do ar automaticamente após o dia de término.</li>
                    </ul>
                  </div>
                </div>

                <div className="lg:sticky lg:top-28 lg:self-start">
                  <p className="mb-2 text-[0.66rem] font-bold uppercase tracking-[0.18em] text-ash">
                    Prévia do card
                  </p>
                  <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-night-2">
                    <div className="relative aspect-16/10">
                      {cover ? (
                        <EventImage
                          src={cover}
                          alt="Prévia da capa do evento"
                          fill
                          sizes="(max-width: 1024px) 100vw, 420px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center bg-gradient-to-br from-brand-dark/60 via-night-3 to-night">
                          <PartyPopper className="size-10 text-brand-light/50" aria-hidden="true" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/20 to-transparent" />
                      {formValues.eventDate ? (
                        <div className="absolute left-4 top-4 rounded-xl border border-brand/35 bg-night/80 px-3 py-2 text-center backdrop-blur">
                          <span className="block text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-brand-light">
                            {formatMonthShort(formValues.eventDate)}
                          </span>
                          <span className="display block text-2xl text-fog">
                            {formatDay(formValues.eventDate)}
                          </span>
                        </div>
                      ) : null}
                      <span className="absolute right-4 top-4 rounded-full border border-white/15 bg-night/75 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-fog backdrop-blur">
                        {getCategoryLabel(formValues.category)}
                      </span>
                    </div>
                    <div className="space-y-2 p-5">
                      <h3 className="line-clamp-2 font-display text-2xl leading-none tracking-wide text-fog">
                        {formValues.title || "Nome do seu evento"}
                      </h3>
                      <p className="flex items-center gap-1.5 text-xs text-ash">
                        <CalendarDays className="size-3.5 text-brand-light/80" aria-hidden="true" />
                        {formValues.eventDate
                          ? `${formatWeekdayShort(formValues.eventDate)}, ${formatDate(formValues.eventDate)}`
                          : "Data a definir"}
                        {formValues.startTime ? ` · ${formValues.startTime}` : ""}
                      </p>
                      <p className="flex items-center gap-1.5 text-xs text-ash">
                        <MapPin className="size-3.5 text-brand-light/80" aria-hidden="true" />
                        <span className="truncate">
                          {formValues.meetingPoint || "Ponto de encontro"} · {formValues.city}
                        </span>
                      </p>
                      {hasRoute ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-brand/35 bg-brand/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-brand-light">
                          <Route className="size-3" aria-hidden="true" /> Com rota
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {formValues.images.length > 0 ? (
                    <p className="mt-3 text-xs text-ash">
                      {formValues.images.length}{" "}
                      {formValues.images.length === 1 ? "foto adicional" : "fotos adicionais"} na
                      galeria.
                    </p>
                  ) : null}

                  {!cover ? (
                    <p className="mt-3 flex items-start gap-1.5 text-xs text-ash">
                      <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-300/80" aria-hidden="true" />
                      Sem capa, usaremos a imagem padrão da plataforma.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-white/8 bg-night-2/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex items-center gap-2 text-xs text-ash">
              <Clock className="size-3.5" aria-hidden="true" />
              {uploading ? "Aguarde o envio das imagens." : "Você pode revisar tudo antes de publicar."}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
              {step > 0 ? (
                <Button type="button" variant="ghost" onClick={goBack} disabled={isSubmitting}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Voltar
                </Button>
              ) : (
                <ButtonLink href="/eventos" variant="ghost">
                  Cancelar
                </ButtonLink>
              )}

              {!isReview ? (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => void goNext()}
                  disabled={uploading}
                >
                  Continuar
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  disabled={isSubmitting || uploading}
                  aria-busy={isSubmitting}
                  onClick={() => void handleSubmit(onValid)()}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      {mode === "create" ? "Publicando..." : "Salvando..."}
                    </>
                  ) : mode === "create" ? (
                    <>
                      <Send className="size-4" aria-hidden="true" />
                      Publicar evento
                    </>
                  ) : (
                    <>
                      <Check className="size-4" aria-hidden="true" />
                      Salvar alterações
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
