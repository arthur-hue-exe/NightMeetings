import { z } from "zod";
import {
  CATEGORY_VALUES,
  COMMUNITY_CATEGORY_VALUES,
  FORUM_MESSAGE_MAX,
  MAX_EVENT_IMAGES,
  MAX_GROUP_MEMBERS,
  PRIVATE_MESSAGE_MAX,
} from "@/lib/constants";
import { isValidISODate } from "@/lib/dates";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_MESSAGE = "Informe uma data válida no formato DD/MM/AAAA.";
const TIME_MESSAGE = "Informe um horário válido (HH:mm).";
const IMAGE_PATH_REGEX =
  /^\/(uploads\/[0-9a-f-]{36}\.webp|images\/events\/[a-z0-9-]+\.webp)$/;

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, DATE_MESSAGE)
  .refine(isValidISODate, DATE_MESSAGE);

const timeField = z.string().regex(TIME_REGEX, TIME_MESSAGE);

const optionalText = (max: number, message: string) =>
  z.string().trim().max(max, message).default("");

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Use pelo menos 2 caracteres no seu nome ou apelido.")
    .max(40, "O nome pode ter no máximo 40 caracteres."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(160, "E-mail muito longo.")
    .email("Informe um e-mail válido."),
  password: z
    .string()
    .min(8, "A senha precisa ter pelo menos 8 caracteres.")
    .max(72, "A senha pode ter no máximo 72 caracteres."),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(160, "E-mail muito longo.")
    .email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe sua senha.").max(72, "Senha inválida."),
});

export const eventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(4, "Dê um nome com pelo menos 4 caracteres.")
      .max(90, "O nome pode ter no máximo 90 caracteres."),
    category: z.enum(CATEGORY_VALUES, "Escolha uma categoria."),
    city: z
      .string()
      .trim()
      .min(2, "Informe a cidade.")
      .max(60, "Nome de cidade muito longo."),
    eventDate: dateField,
    startTime: timeField,
    endDate: z
      .union([z.literal(""), dateField])
      .default(""),
    meetingPoint: z
      .string()
      .trim()
      .min(3, "Informe o ponto de encontro.")
      .max(140, "Máximo de 140 caracteres."),
    description: optionalText(4000, "Descrição muito longa."),
    departurePoint: optionalText(140, "Máximo de 140 caracteres."),
    departureTime: z.union([z.literal(""), timeField]).default(""),
    arrivalPoint: optionalText(140, "Máximo de 140 caracteres."),
    arrivalDate: z.union([z.literal(""), dateField]).default(""),
    arrivalTime: z.union([z.literal(""), timeField]).default(""),
    routeNotes: optionalText(2000, "Máximo de 2000 caracteres."),
    rules: optionalText(2000, "Máximo de 2000 caracteres."),
    additionalInfo: optionalText(2000, "Máximo de 2000 caracteres."),
    contactInstagram: z
      .string()
      .trim()
      .max(120, "Máximo de 120 caracteres.")
      .default("")
      .refine(
        (value) =>
          !value ||
          /^@?[A-Za-z0-9._]{1,30}$/.test(value) ||
          /^https?:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]{1,30}\/?$/.test(value),
        "Informe um @usuário ou link do Instagram.",
      ),
    coverImageUrl: z
      .string()
      .trim()
      .max(300)
      .default("")
      .refine(
        (value) => !value || IMAGE_PATH_REGEX.test(value),
        "Imagem de capa inválida.",
      ),
    images: z
      .array(z.string().regex(IMAGE_PATH_REGEX, "Imagem inválida."))
      .max(MAX_EVENT_IMAGES, `Envie no máximo ${MAX_EVENT_IMAGES} fotos.`)
      .default([]),
  })
  .superRefine((data, ctx) => {
    const routeTouched = [
      data.departurePoint,
      data.departureTime,
      data.arrivalPoint,
      data.arrivalDate,
      data.arrivalTime,
      data.routeNotes,
    ].some((value) => Boolean(value && value.trim()));

    if (routeTouched) {
      if (!data.departurePoint) {
        ctx.addIssue({
          code: "custom",
          path: ["departurePoint"],
          message: "Informe o ponto de saída da rota.",
        });
      }
      if (!data.departureTime) {
        ctx.addIssue({
          code: "custom",
          path: ["departureTime"],
          message: "Informe o horário de saída.",
        });
      }
    }

    if (data.arrivalPoint && !data.arrivalTime) {
      ctx.addIssue({
        code: "custom",
        path: ["arrivalTime"],
        message: "Informe o horário estimado de chegada.",
      });
    }

    if (data.arrivalTime && !data.arrivalPoint) {
      ctx.addIssue({
        code: "custom",
        path: ["arrivalPoint"],
        message: "Informe o local de chegada.",
      });
    }

    if (data.arrivalDate && !data.arrivalPoint) {
      ctx.addIssue({
        code: "custom",
        path: ["arrivalPoint"],
        message: "Informe o local de chegada.",
      });
    }

    if (data.endDate && data.endDate < data.eventDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "A data final não pode ser anterior à data do evento.",
      });
    }

    if (data.arrivalDate && data.arrivalDate < data.eventDate) {
      ctx.addIssue({
        code: "custom",
        path: ["arrivalDate"],
        message: "A chegada não pode ser antes da data do evento.",
      });
    }

    if (data.arrivalDate && data.arrivalTime && !data.arrivalPoint) {
      ctx.addIssue({
        code: "custom",
        path: ["arrivalPoint"],
        message: "Informe o local de chegada.",
      });
    }
  });

export type EventInput = z.infer<typeof eventSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

export function normalizeOptional(value: string | undefined | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeInstagram(value: string | undefined | null) {
  if (!value) return null;
  let handle = value.trim();
  if (!handle) return null;
  handle = handle
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/+$/, "")
    .replace(/^@/, "");
  return handle || null;
}

export function isUploadedImagePath(url: string | null | undefined) {
  return Boolean(url && url.startsWith("/uploads/"));
}

const COMMUNITY_EMBLEM_REGEX = /^\/uploads\/[0-9a-f-]{36}\.webp$/;
const COMMUNITY_IMAGE_REGEX = /^\/(uploads\/[0-9a-f-]{36}\.webp|images\/events\/[a-z0-9-]+\.webp)$/;

export function isWhatsAppInviteUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.hostname !== "chat.whatsapp.com") return false;
    if (url.username || url.password || url.port) return false;
    if (url.search || url.hash) return false;
    const path = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");
    return /^(?:invite\/)?[A-Za-z0-9]{10,64}$/.test(path);
  } catch {
    return false;
  }
}

export const communitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Dê um nome com pelo menos 3 caracteres.")
    .max(60, "O nome pode ter no máximo 60 caracteres."),
  description: z.string().trim().max(500, "A descrição pode ter no máximo 500 caracteres.").default(""),
  city: z.string().trim().max(60, "A cidade ou região pode ter no máximo 60 caracteres.").default(""),
  category: z.enum(COMMUNITY_CATEGORY_VALUES, "Escolha uma categoria.").default("OUTROS"),
  emblemUrl: z
    .string()
    .trim()
    .regex(COMMUNITY_EMBLEM_REGEX, "Envie um emblema para a comunidade.")
    .refine((value) => value.length > 0, "O emblema é obrigatório."),
  whatsappInviteUrl: z
    .string()
    .trim()
    .min(1, "Informe o link de convite do WhatsApp.")
    .max(300, "Link muito longo.")
    .refine(isWhatsAppInviteUrl, "Informe um convite válido do WhatsApp (https://chat.whatsapp.com/...)."),
});

export const forumMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Escreva uma mensagem antes de enviar.")
    .max(FORUM_MESSAGE_MAX, `A mensagem pode ter no máximo ${FORUM_MESSAGE_MAX} caracteres.`),
});

export const privateMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Escreva uma mensagem antes de enviar.")
    .max(PRIVATE_MESSAGE_MAX, `A mensagem pode ter no máximo ${PRIVATE_MESSAGE_MAX} caracteres.`),
});

export const directConversationSchema = z.object({
  userId: z.string().trim().min(1, "Escolha um usuário."),
});

export const groupConversationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Dê um nome ao grupo.")
    .max(60, "O nome do grupo pode ter no máximo 60 caracteres."),
  memberIds: z
    .array(z.string().trim().min(1))
    .min(1, "Convide pelo menos um participante.")
    .max(MAX_GROUP_MEMBERS - 1, `O grupo pode ter no máximo ${MAX_GROUP_MEMBERS} participantes.`),
  imageUrl: z
    .string()
    .trim()
    .max(300)
    .refine((value) => !value || COMMUNITY_IMAGE_REGEX.test(value), "Imagem inválida.")
    .default(""),
});

export const conversationUpdateSchema = z.object({
  name: z.string().trim().min(2).max(60, "O nome do grupo pode ter no máximo 60 caracteres.").optional(),
  imageUrl: z
    .string()
    .trim()
    .max(300)
    .refine((value) => !value || COMMUNITY_IMAGE_REGEX.test(value), "Imagem inválida.")
    .optional(),
  status: z.enum(["ACTIVE", "CLOSED"]).optional(),
});

export const conversationMembersSchema = z.object({
  userIds: z
    .array(z.string().trim().min(1))
    .min(1, "Escolha pelo menos um participante.")
    .max(MAX_GROUP_MEMBERS, `Limite de ${MAX_GROUP_MEMBERS} participantes.`),
});

export const reportSchema = z.object({
  targetType: z.enum(["GLOBAL_MESSAGE", "COMMUNITY"]),
  targetId: z.string().trim().min(1).max(80),
  reason: z.enum(["SPAM", "ABUSO", "CONTEUDO_INADEQUADO", "GOLPE", "OUTRO"]),
  details: z.string().trim().max(300, "Detalhes muito longos.").default(""),
});

export const cookieConsentSchema = z.object({
  preferences: z.boolean(),
  analytics: z.boolean(),
});

export type CommunityInput = z.infer<typeof communitySchema>;
export type ForumMessageInput = z.infer<typeof forumMessageSchema>;
export type PrivateMessageInput = z.infer<typeof privateMessageSchema>;
export type GroupConversationInput = z.infer<typeof groupConversationSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
