type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const ENABLED = __DEV__;

function nowTs() {
  return Date.now();
}

export function log(scope: string, level: LogLevel, message: string, data?: any) {
  if (!ENABLED) return;
  const ts = new Date().toISOString();
  try {
    const base = `[${ts}] [${scope}] ${message}`;
    if (data !== undefined) {
      // Keep data compact to avoid performance cost
      const preview = typeof data === 'object' ? JSON.stringify(data).slice(0, 500) : String(data);
      // eslint-disable-next-line no-console
      console[level]?.(`${base} :: ${preview}`);
    } else {
      // eslint-disable-next-line no-console
      console[level]?.(base);
    }
  } catch {}
}

export function timeStart(scope: string, label: string) {
  const key = `${scope}:${label}:${Math.random().toString(36).slice(2)}`;
  const start = nowTs();
  return {
    end: (extra?: any) => {
      const dur = nowTs() - start;
      log(scope, 'info', `${label} done in ${dur}ms`, extra);
      return dur;
    },
  };
}

export function throttle(fn: (...args: any[]) => void, ms = 1000) {
  let last = 0;
  let pending: any = null;
  return (...args: any[]) => {
    const now = nowTs();
    if (now - last >= ms) {
      last = now;
      return fn(...args);
    }
    pending = args;
    setTimeout(() => {
      if (pending) {
        last = nowTs();
        fn(...pending);
        pending = null;
      }
    }, ms - (now - last));
  };
}


