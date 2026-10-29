import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fieldErrors, isSameOrigin, jsonError, validationMessage } from "@/lib/api";
import { deleteUploadByUrl, uploadExists } from "@/lib/storage";
import { communitySchema } from "@/lib/validation";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

async function findAuthorized(id: string, userId: string, role: string) {
  const community = await prisma.community.findUnique({ where: { id } });
  if (!community) return { error: "not_found" as const };
  if (community.creatorId !== userId && role !== "ADMIN") return { error: "forbidden" as const };
  return { community };
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para editar a comunidade.", 401);

  const { id } = await context.params;
  const found = await findAuthorized(id, user.id, user.role);
  if (found.error === "not_found") return jsonError("Comunidade não encontrada.", 404);
  if (found.error === "forbidden") return jsonError("Você não tem permissão para editar esta comunidade.", 403);

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
    return jsonError("Envie um emblema válido para a comunidade.", 422, {
      fieldErrors: { emblemUrl: "O emblema é obrigatório." },
    });
  }

  const previous = found.community;
  try {
    const community = await prisma.community.update({
      where: { id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description || null,
        city: parsed.data.city || null,
        category: parsed.data.category,
        emblemUrl: parsed.data.emblemUrl,
        whatsappInviteUrl: parsed.data.whatsappInviteUrl,
      },
      select: { id: true, slug: true },
    });

    if (previous.emblemUrl !== parsed.data.emblemUrl) {
      await deleteUploadByUrl(previous.emblemUrl);
    }

    return NextResponse.json({ ok: true, community });
  } catch (error) {
    console.error("Falha ao atualizar comunidade", error);
    return jsonError("Não foi possível salvar as alterações agora.", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isSameOrigin(request)) return jsonError("Origem da requisição não autorizada.", 403);
  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para excluir a comunidade.", 401);

  const { id } = await context.params;
  const found = await findAuthorized(id, user.id, user.role);
  if (found.error === "not_found") return jsonError("Comunidade não encontrada.", 404);
  if (found.error === "forbidden") return jsonError("Você não tem permissão para excluir esta comunidade.", 403);

  await prisma.community.update({ where: { id }, data: { status: "DISABLED" } });
  await prisma.moderationLog.create({
    data: {
      actorId: user.id,
      action: "COMMUNITY_DISABLED",
      targetType: "COMMUNITY",
      targetId: id,
      notes: "Comunidade desativada pelo proprietário ou administração.",
    },
  });
  return NextResponse.json({ ok: true });
}
