import { NextResponse, type NextRequest } from "next/server";
import { getApiUser } from "@/lib/session";
import { subscribeUserNotifications } from "@/lib/live-notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getApiUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      push("connected", { ok: true });

      unsubscribe = subscribeUserNotifications(user.id, (payload) => {
        push("notification", payload);
      });

      heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": ping\n\n"));
      }, 15000);

      request.signal.addEventListener(
        "abort",
        () => {
          if (heartbeat) clearInterval(heartbeat);
          if (unsubscribe) unsubscribe();
          controller.close();
        },
        { once: true }
      );
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      if (unsubscribe) unsubscribe();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
