export const SITE_NAME = "MotorMeetings";
export const SITE_DESCRIPTION =
  "Encontre a galera, descubra encontros de motos e organize seu próximo destino em Goiânia e região.";
export const INSTAGRAM_URL = "https://www.instagram.com/a.alves_silva/";
export const PLATFORM_REGION = "Goiânia e região metropolitana";

export type CategoryValue =
  | "ENCONTRO_POSTO"
  | "ROLE_NOTURNO"
  | "PASSEIO_GRUPO"
  | "ENCONTRO_ESPORTIVAS"
  | "ENCONTRO_CUSTOM"
  | "EVENTO_BENEFICENTE"
  | "EXPOSICAO"
  | "OUTROS";

export const EVENT_CATEGORIES: ReadonlyArray<{
  value: CategoryValue;
  label: string;
  short: string;
  description: string;
}> = [
  {
    value: "ENCONTRO_POSTO",
    label: "Encontro em posto",
    short: "Posto",
    description: "Ponto de encontro clássico para reunir a galera.",
  },
  {
    value: "ROLE_NOTURNO",
    label: "Rolê noturno",
    short: "Noturno",
    description: "A cidade acende e a moto sai para a rua.",
  },
  {
    value: "PASSEIO_GRUPO",
    label: "Passeio em grupo",
    short: "Passeio",
    description: "Estrada, destino e companhia para o caminho.",
  },
  {
    value: "ENCONTRO_ESPORTIVAS",
    label: "Encontro de esportivas",
    short: "Esportivas",
    description: "Para quem gosta de carenagem, pista e adrenalina.",
  },
  {
    value: "ENCONTRO_CUSTOM",
    label: "Encontro de motos custom",
    short: "Custom",
    description: "Customização, estilo e cultura em cada detalhe.",
  },
  {
    value: "EVENTO_BENEFICENTE",
    label: "Evento beneficente",
    short: "Beneficente",
    description: "Duas rodas a serviço de uma boa causa.",
  },
  {
    value: "EXPOSICAO",
    label: "Exposição de motos",
    short: "Exposição",
    description: "Máquinas especiais reunidas para serem vistas de perto.",
  },
  {
    value: "OUTROS",
    label: "Outros",
    short: "Outros",
    description: "Um encontro com a sua cara, do seu jeito.",
  },
];

export const CATEGORY_VALUES = EVENT_CATEGORIES.map((category) => category.value) as [
  CategoryValue,
  ...CategoryValue[],
];

export function getCategory(value: string) {
  return EVENT_CATEGORIES.find((category) => category.value === value) ?? null;
}

export function getCategoryLabel(value: string) {
  return getCategory(value)?.label ?? "Outros";
}

export const CITY_SUGGESTIONS = [
  "Goiânia",
  "Aparecida de Goiânia",
  "Senador Canedo",
  "Trindade",
  "Goianira",
  "Nerópolis",
  "Outra cidade",
] as const;

export const EVENT_STATUS = {
  ACTIVE: "Ativo",
  CANCELLED: "Cancelado",
  DELETED: "Excluído",
} as const;

export type EventStatus = keyof typeof EVENT_STATUS;

export const MAX_EVENT_IMAGES = 6;
export const MAX_IMAGE_BYTES = Number(process.env.MAX_UPLOAD_MB ?? "5") * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;

export const COMMUNITY_CATEGORIES = [
  { value: "ESPORTIVAS", label: "Motociclistas esportivos" },
  { value: "CUSTOM", label: "Motos custom" },
  { value: "MOTOCLUBES", label: "Motoclubes" },
  { value: "NOTURNOS", label: "Rolês noturnos" },
  { value: "TURISMO", label: "Turismo de moto" },
  { value: "INICIANTES", label: "Motociclistas iniciantes" },
  { value: "REGIONAIS", label: "Comunidades regionais" },
  { value: "OUTROS", label: "Outros" },
] as const;

export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number]["value"];
export const COMMUNITY_CATEGORY_VALUES = COMMUNITY_CATEGORIES.map((item) => item.value) as [
  CommunityCategory,
  ...CommunityCategory[],
];

export function getCommunityCategory(value: string) {
  return COMMUNITY_CATEGORIES.find((item) => item.value === value) ?? null;
}

export const FORUM_MESSAGE_MAX = 1000;
export const PRIVATE_MESSAGE_MAX = 2000;
export const FORUM_PAGE_SIZE = 30;
export const MESSAGE_PAGE_SIZE = 40;
export const MAX_GROUP_MEMBERS = 25;
export const MAX_COMMUNITY_PAGE_SIZE = 12;

export const COOKIE_CONSENT_COOKIE = "mm_consent";
export const COOKIE_CONSENT_VERSION = "2026-10-29";
export const ANON_SESSION_COOKIE = "mm_anon";

export const COMMUNITY_STATUS = {
  ACTIVE: "Ativa",
  DISABLED: "Desativada",
} as const;

export const NOTIFICATION_TYPES = {
  NEW_EVENT: "Novo evento",
  PRIVATE_MESSAGE: "Mensagem privada",
  GROUP_ADDED: "Grupo privado",
  GROUP_UPDATED: "Grupo atualizado",
} as const;

export type NotificationType = keyof typeof NOTIFICATION_TYPES;
