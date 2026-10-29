import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isSameOrigin, jsonError } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { logUploadFailure, saveImage } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return jsonError("Origem da requisição não autorizada.", 403);
  }

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para enviar imagens.", 401);

  const limit = rateLimit(`upload:${user.id}`, 80, 60 * 60 * 1000);
  if (!limit.ok) {
    return jsonError("Limite de envios atingido. Aguarde alguns minutos.", 429);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch (error) {
    logUploadFailure("formdata", error, {
      contentType: request.headers.get("content-type")?.slice(0, 80) ?? "unknown",
    });
    return jsonError("Não foi possível ler o arquivo enviado.", 400, {
      code: "INVALID_FORM_DATA",
    });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return jsonError("Nenhum arquivo foi enviado.", 400, { code: "MISSING_FILE" });
  }

  const result = await saveImage(file);
  if (!result.ok) {
    return jsonError(result.error, result.status, { code: result.code });
  }

  return NextResponse.json({
    ok: true,
    url: result.url,
    width: result.width,
    height: result.height,
  });
}
