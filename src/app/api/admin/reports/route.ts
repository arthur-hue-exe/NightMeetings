import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError("Entre na sua conta.", 401);
  if (user.role !== "ADMIN") return jsonError("Acesso restrito à moderação.", 403);

  const status = new URL(request.url).searchParams.get("status") ?? "PENDING";
  const where =
    status === "ALL"
      ? {}
      : { status: status === "RESOLVED" ? "RESOLVED" : status === "DISMISSED" ? "DISMISSED" : "PENDING" };

  const reports = await prisma.report.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  const messageIds = reports.filter((report) => report.targetType === "GLOBAL_MESSAGE").map((r) => r.targetId);
  const communityIds = reports.filter((report) => report.targetType === "COMMUNITY").map((r) => r.targetId);

  const [messages, communities] = await Promise.all([
    prisma.globalMessage.findMany({
      where: { id: { in: messageIds } },
      select: {
        id: true,
        displayName: true,
        content: true,
        createdAt: true,
        sessionId: true,
        moderationStatus: true,
      },
    }),
    prisma.community.findMany({
      where: { id: { in: communityIds } },
      select: { id: true, name: true, slug: true, status: true, creatorId: true },
    }),
  ]);

  const messageMap = new Map(messages.map((message) => [message.id, message]));
  const communityMap = new Map(communities.map((community) => [community.id, community]));

  return NextResponse.json(
    {
      ok: true,
      reports: reports.map((report) => ({
        id: report.id,
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
        details: report.details,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
        reviewedAt: report.reviewedAt?.toISOString() ?? null,
        message: messageMap.get(report.targetId) ?? null,
        community: communityMap.get(report.targetId) ?? null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
