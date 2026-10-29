const FILE_NAME = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.webp";

const LOCAL_UPLOAD_REGEX = new RegExp(`^/uploads/${FILE_NAME}$`);
const SEED_EVENT_IMAGE_REGEX = /^\/images\/events\/[a-z0-9-]+\.webp$/;
const BLOB_HOST_SUFFIX = ".public.blob.vercel-storage.com";
const BLOB_PATH_REGEX = new RegExp(`^/uploads/${FILE_NAME}$`);

export function isLocalUploadUrl(url: string | null | undefined): boolean {
  return Boolean(url && LOCAL_UPLOAD_REGEX.test(url));
}

export function isSeedEventImageUrl(url: string | null | undefined): boolean {
  return Boolean(url && SEED_EVENT_IMAGE_REGEX.test(url));
}

export function isBlobImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password || parsed.port) return false;
    if (!parsed.hostname.endsWith(BLOB_HOST_SUFFIX)) return false;
    if (parsed.search || parsed.hash) return false;
    return BLOB_PATH_REGEX.test(parsed.pathname);
  } catch {
    return false;
  }
}

export function isStoredImageUrl(url: string | null | undefined): boolean {
  return isLocalUploadUrl(url) || isSeedEventImageUrl(url) || isBlobImageUrl(url);
}

export function isCommunityEmblemUrl(url: string | null | undefined): boolean {
  return isLocalUploadUrl(url) || isBlobImageUrl(url);
}

export function shouldBypassImageOptimizer(url: string | null | undefined): boolean {
  return isLocalUploadUrl(url) || isBlobImageUrl(url);
}
