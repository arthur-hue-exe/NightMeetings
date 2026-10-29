import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta para buscar pessoas.", 401);

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ ok: true, users: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      name: { contains: q.slice(0, 40) },
    },
    orderBy: { name: "asc" },
    take: 8,
    select: { id: true, name: true },
  });

  return NextResponse.json(
    { ok: true, users },
    { headers: { "Cache-Control": "no-store" } },
  );
}
