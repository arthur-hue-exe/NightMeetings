type Client = ReadableStreamDefaultController<Uint8Array>;

const globalStore = globalThis as typeof globalThis & {
  __mmRealtime?: Map<string, Set<Client>>;
};

const channels = (globalStore.__mmRealtime ??= new Map());

const encoder = new TextEncoder();

export function subscribe(channel: string, client: Client) {
  let set = channels.get(channel);
  if (!set) {
    set = new Set();
    channels.set(channel, set);
  }
  set.add(client);

  return () => {
    set?.delete(client);
    if (set && set.size === 0) channels.delete(channel);
  };
}

export function publish(channel: string, event: string, data: unknown) {
  const set = channels.get(channel);
  if (!set || set.size === 0) return;
  const payload = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  for (const client of set) {
    try {
      client.enqueue(payload);
    } catch {
      set.delete(client);
    }
  }
}

export function sseResponse(request: Request, channelsToJoin: string[], onOpen?: () => void) {
  const unsubscribers: Record<string, () => void> = {};
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const cleanup = () => {
    for (const channel of channelsToJoin) unsubscribers[channel]?.();
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = undefined;
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const channel of channelsToJoin) {
        unsubscribers[channel] = subscribe(channel, controller);
      }
      controller.enqueue(encoder.encode(`event: ready\ndata: ${JSON.stringify({ ok: true })}\n\n`));
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          cleanup();
        }
      }, 25_000);
      onOpen?.();

      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
