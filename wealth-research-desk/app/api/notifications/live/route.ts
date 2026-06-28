import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const afterParam = request.nextUrl.searchParams.get("after");
  const afterDate = afterParam ? new Date(afterParam) : new Date(0);
  const validAfter = Number.isNaN(afterDate.getTime()) ? new Date(0) : afterDate;

  const notifications = await prisma.notification.findMany({
    where: {
      userId: user.id,
      createdAt: { gt: validAfter }
    },
    orderBy: { createdAt: "asc" },
    take: 20
  });

  return NextResponse.json({
    notifications: notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      createdAt: notification.createdAt.toISOString()
    }))
  });
}
