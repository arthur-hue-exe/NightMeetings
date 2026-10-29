import { access, mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { del, head, put } from "@vercel/blob";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/constants";
import { isBlobImageUrl, isLocalUploadUrl } from "@/lib/image-urls";

export const UPLOAD_DIR =
  process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), "storage", "uploads");

const FILE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;
const TOKEN_PATTERN = /(?:vercel_blob_rw_[A-Za-z0-9_-]+)|(?:Bearer\s+[A-Za-z0-9._-]+)/g;

export type StorageDriver = "local" | "vercel-blob";

export type UploadFailureCode =
  | "UNSUPPORTED_TYPE"
  | "EMPTY_FILE"
  | "TOO_LARGE"
  | "INVALID_IMAGE"
  | "UNREADABLE_FILE"
  | "PROCESSING_FAILED"
  | "STORAGE_UNCONFIGURED"
  | "STORAGE_FAILED";

export type UploadResult =
  | { ok: true; url: string; width: number; height: number }
  | { ok: false; code: UploadFailureCode; status: number; error: string };

function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN?.trim() || null;
}

export function resolveStorageDriver(): StorageDriver | null {
  const configured = process.env.STORAGE_DRIVER?.trim().toLowerCase();
  if (configured === "local") return "local";
  if (configured === "vercel-blob") return blobToken() ? "vercel-blob" : null;
  if (blobToken()) return "vercel-blob";
  if (process.env.VERCEL === "1") return null;
  return "local";
}

function sanitizeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(TOKEN_PATTERN, "[redacted]").slice(0, 300);
}

/** Registra etapa e erro real sem expor tokens, credenciais ou conteúdo do arquivo. */
export function logUploadFailure(
  stage: string,
  error: unknown,
  context: Record<string, string | number | boolean | null | undefined> = {},
) {
  console.error("[upload] falha", {
    stage,
    ...context,
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: sanitizeMessage(error),
  });
}

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

function isDecodeFailure(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /unsupported image format|corrupt|premature|invalid|decode|Vips/i.test(error.message);
}

export async function saveImage(file: File): Promise<UploadResult> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return {
      ok: false,
      code: "UNSUPPORTED_TYPE",
      status: 415,
      error: "Formato não permitido. Envie JPG, PNG, WebP ou AVIF.",
    };
  }

  if (file.size <= 0) {
    return { ok: false, code: "EMPTY_FILE", status: 400, error: "O arquivo enviado está vazio." };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const limitMb = Math.round((MAX_IMAGE_BYTES / (1024 * 1024)) * 10) / 10;
    return {
      ok: false,
      code: "TOO_LARGE",
      status: 413,
      error: `A imagem excede o limite de ${limitMb} MB.`,
    };
  }

  const driver = resolveStorageDriver();
  if (!driver) {
    logUploadFailure("storage-config", new Error("Driver de storage não configurado"), {
      vercel: process.env.VERCEL === "1",
      hasBlobToken: Boolean(blobToken()),
    });
    return {
      ok: false,
      code: "STORAGE_UNCONFIGURED",
      status: 503,
      error: "O armazenamento de imagens não está configurado neste ambiente.",
    };
  }

  let input: Buffer;
  try {
    input = Buffer.from(await file.arrayBuffer());
  } catch (error) {
    logUploadFailure("read", error, { mime: file.type, bytes: file.size });
    return {
      ok: false,
      code: "UNREADABLE_FILE",
      status: 400,
      error: "Não foi possível ler o arquivo enviado. Tente novamente.",
    };
  }

  if (!hasValidSignature(input, file.type)) {
    return {
      ok: false,
      code: "INVALID_IMAGE",
      status: 422,
      error: "O arquivo não parece ser uma imagem válida ou está corrompido.",
    };
  }

  let processed: { data: Buffer; width: number; height: number };
  try {
    const output = await sharp(input, { failOn: "error", limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    processed = { data: output.data, width: output.info.width, height: output.info.height };
  } catch (error) {
    logUploadFailure("process", error, { mime: file.type, bytes: file.size });
    if (isDecodeFailure(error)) {
      return {
        ok: false,
        code: "INVALID_IMAGE",
        status: 422,
        error: "Não foi possível processar a imagem. Envie um JPG, PNG, WebP ou AVIF válido.",
      };
    }
    return {
      ok: false,
      code: "PROCESSING_FAILED",
      status: 500,
      error: "Falha interna ao processar a imagem. Tente novamente mais tarde.",
    };
  }

  const filename = `${randomUUID()}.webp`;

  if (driver === "local") {
    try {
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(path.join(UPLOAD_DIR, filename), processed.data);
    } catch (error) {
      logUploadFailure("storage", error, { driver });
      return {
        ok: false,
        code: "STORAGE_FAILED",
        status: 500,
        error: "Não foi possível salvar a imagem no servidor. Tente novamente.",
      };
    }
    return { ok: true, url: `/uploads/${filename}`, width: processed.width, height: processed.height };
  }

  const token = blobToken();
  if (!token) {
    return {
      ok: false,
      code: "STORAGE_UNCONFIGURED",
      status: 503,
      error: "O armazenamento de imagens não está configurado neste ambiente.",
    };
  }

  try {
    const blob = await put(`uploads/${filename}`, processed.data, {
      access: "public",
      contentType: "image/webp",
      token,
      addRandomSuffix: false,
      cacheControlMaxAge: 31_536_000,
    });
    return { ok: true, url: blob.url, width: processed.width, height: processed.height };
  } catch (error) {
    logUploadFailure("storage", error, { driver });
    return {
      ok: false,
      code: "STORAGE_FAILED",
      status: 502,
      error: "Não foi possível armazenar a imagem agora. Tente novamente em instantes.",
    };
  }
}

export function resolveUploadPath(filename: string) {
  if (!FILE_REGEX.test(filename)) return null;
  const resolved = path.resolve(UPLOAD_DIR, filename);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) return null;
  return resolved;
}

export async function deleteUploadByUrl(url: string | null | undefined) {
  if (!url) return;

  if (isLocalUploadUrl(url)) {
    const filePath = resolveUploadPath(url.replace("/uploads/", ""));
    if (!filePath) return;
    await unlink(filePath).catch(() => undefined);
    return;
  }

  if (isBlobImageUrl(url)) {
    const token = blobToken();
    if (!token) {
      console.warn("[upload] remoção ignorada: BLOB_READ_WRITE_TOKEN ausente", { url });
      return;
    }
    try {
      await del(url, { token });
    } catch (error) {
      logUploadFailure("delete", error, { driver: "vercel-blob" });
    }
  }
}

export async function uploadExists(url: string | null | undefined) {
  if (!url) return false;

  if (isLocalUploadUrl(url)) {
    const filePath = resolveUploadPath(url.replace("/uploads/", ""));
    if (!filePath) return false;
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  if (isBlobImageUrl(url)) {
    const token = blobToken();
    if (token) {
      try {
        await head(url, { token });
        return true;
      } catch {
        return false;
      }
    }
    try {
      const response = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      return response.ok;
    } catch {
      return false;
    }
  }

  return false;
}
