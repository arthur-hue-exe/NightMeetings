import { randomBytes } from "node:crypto";

const SLUG_CHARS = "0123456789abcdefghijklmnopqrstuvwxyz";

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function buildSlug(title: string) {
  const base = slugify(title) || "evento";
  const suffix = Array.from(randomBytes(5))
    .map((byte) => SLUG_CHARS[byte % SLUG_CHARS.length])
    .join("");
  return `${base}-${suffix}`;
}
