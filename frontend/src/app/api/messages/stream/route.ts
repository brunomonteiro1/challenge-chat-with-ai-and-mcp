import { subscribe, type ChatMessage } from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function GET() {
  let unsubscribe: (() => void) | null = null;
  let keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: unknown) => {
        const chunk = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      };


      keepAliveTimer = setInterval(() => {
        controller.enqueue(encoder.encode(`: keep-alive\n\n`));
      }, 25000);

      unsubscribe = subscribe((msg: ChatMessage) => send(msg));


      controller.enqueue(encoder.encode(`event: open\n` + `data: "ok"\n\n`));
    },
    cancel() {
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
