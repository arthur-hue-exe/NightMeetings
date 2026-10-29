import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fieldErrors, isSameOrigin, jsonError, validationMessage } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { buildSlug } from "@/lib/slug";
import { uploadExists } from "@/lib/storage";
import { communitySchema } from "@/lib/validation";
import { listCommunities } from "@/lib/community";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const data = await listCommunities({
    q: params.get("q")?.trim() || undefined,
    category: params.get("category")?.trim() || undefined,
    city: params.get("city")?.trim() || undefined,
    limit: Number(params.get("limit") ?? 9),
    offset: Number(params.get("offset") ?? 0),
  });
  return NextResponse.json({ ok: true, ...data });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);

  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para criar uma comunidade.", 401);

  const limit = rateLimit(`community-create:${user.id}`, 6, 60 * 60 * 1000);
  if (!limit.ok) {
    return jsonError("Você criou muitas comunidades em pouco tempo. Tente novamente mais tarde.", 429);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Não foi possível ler os dados enviados.", 400);
  }

  const parsed = communitySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(validationMessage(parsed.error), 422, { fieldErrors: fieldErrors(parsed.error) });
  }

  if (!(await uploadExists(parsed.data.emblemUrl))) {
    return jsonError("Envie o emblema da comunidade antes de publicar.", 422, {
      fieldErrors: { emblemUrl: "O emblema é obrigatório." },
    });
  }

  try {
    let slug = buildSlug(parsed.data.name);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const exists = await prisma.community.findUnique({ where: { slug }, select: { id: true } });
      if (!exists) break;
      slug = buildSlug(parsed.data.name);
    }

    const community = await prisma.community.create({
      data: {
        name: parsed.data.name,
        slug,
        description: parsed.data.description || null,
        city: parsed.data.city || null,
        category: parsed.data.category,
        emblemUrl: parsed.data.emblemUrl,
        whatsappInviteUrl: parsed.data.whatsappInviteUrl,
        creatorId: user.id,
      },
      select: { id: true, slug: true, name: true },
    });

    return NextResponse.json({ ok: true, community }, { status: 201 });
  } catch (error) {
    console.error("Falha ao criar comunidade", error);
    return jsonError("Não foi possível criar a comunidade agora. Tente novamente.", 500);
  }
}
