import { mkdir, writeFile, unlink, access } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), "storage", "uploads");

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export type UploadResult =
  | { ok: true; url: string; width: number; height: number }
  | { ok: false; error: string };

function hasValidSignature(buffer: Buffer, mime: string) {
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (mime === "image/webp") {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  if (mime === "image/avif") {
    return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  }
  return false;
}

export async function saveImage(file: File): Promise<UploadResult> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { ok: false, error: "Formato não permitido. Envie JPG, PNG, WebP ou AVIF." };
  }

  if (file.size <= 0) {
    return { ok: false, error: "O arquivo enviado está vazio." };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const limitMb = Math.round((MAX_IMAGE_BYTES / (1024 * 1024)) * 10) / 10;
    return { ok: false, error: `A imagem excede o limite de ${limitMb} MB.` };
  }

  const input = Buffer.from(await file.arrayBuffer());
  if (!hasValidSignature(input, file.type)) {
    return { ok: false, error: "O arquivo não parece ser uma imagem válida." };
  }

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });

    const filename = `${randomUUID()}.webp`;
    const outputPath = path.join(UPLOAD_DIR, filename);

    const info = await sharp(input, { failOn: "error", limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outputPath);

    return { ok: true, url: `/uploads/${filename}`, width: info.width, height: info.height };
  } catch {
    return { ok: false, error: "Não foi possível processar a imagem. Tente outro arquivo." };
  }
}

const FILE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

export function resolveUploadPath(filename: string) {
  if (!FILE_REGEX.test(filename)) return null;
  const resolved = path.resolve(UPLOAD_DIR, filename);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) return null;
  return resolved;
}

export async function deleteUploadByUrl(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/")) return;
  const filename = url.replace("/uploads/", "");
  const filePath = resolveUploadPath(filename);
  if (!filePath) return;
  await unlink(filePath).catch(() => undefined);
}

export function extensionFor(mime: string) {
  return EXTENSION_BY_TYPE[mime] ?? "bin";
}

export async function uploadExists(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/")) return false;
  const filePath = resolveUploadPath(url.replace("/uploads/", ""));
  if (!filePath) return false;
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
