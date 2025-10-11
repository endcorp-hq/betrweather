type EventSourceLike = {
  addEventListener: (type: string, listener: (evt: MessageEvent) => void) => void;
  removeEventListener: (type: string, listener: (evt: MessageEvent) => void) => void;
  close: () => void;
};

export type SSEOptions = {
  url: string;
  onOpen?: () => void;
  onError?: (err?: any) => void;
  // Map of event name to handler; handlers receive already-parsed data
  events: Record<string, (data: any) => void>;
};

export function startSSE({ url, onOpen, onError, events }: SSEOptions): { stop: () => void } | null {
  // @ts-ignore - injected by polyfill in RN
  const ES = (global as any).EventSource as undefined | (new (u: string) => EventSourceLike);
  if (!ES) return null;

  let es: EventSourceLike | null = null;
  try {
    es = new ES(url);
  } catch (e) {
    onError?.(e);
    return null;
  }

  const listeners: Array<{ name: string; fn: (evt: MessageEvent) => void }> = [];

  const attach = (name: string, handler: (data: any) => void) => {
    const fn = (evt: MessageEvent) => {
      try {
        const parsed = evt?.data ? JSON.parse(String((evt as any).data)) : null;
        handler(parsed);
      } catch (err) {
        // Non-fatal parse error; surface raw data
        handler((evt as any).data);
      }
    };
    es!.addEventListener(name, fn);
    listeners.push({ name, fn });
  };

  if (onOpen) {
    const fn = () => onOpen();
    // open event is standard per MDN
    // https://developer.mozilla.org/en-US/docs/Web/API/EventSource
    es.addEventListener('open' as any, fn as any);
    listeners.push({ name: 'open', fn: fn as any });
  }

  const errorFn = () => onError?.();
  es.addEventListener('error' as any, errorFn as any);
  listeners.push({ name: 'error', fn: errorFn as any });

  for (const [name, handler] of Object.entries(events || {})) {
    attach(name, handler);
  }

  const stop = () => {
    try {
      for (const { name, fn } of listeners) {
        try { es?.removeEventListener(name as any, fn as any); } catch {}
      }
      es?.close();
    } catch {}
    es = null;
  };

  return { stop };
}


