type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const SENSITIVE = /(token|jwt|password|authorization|apikey|api_key|service_role|secret|email|bearer)/i;

function sanitize(value: unknown): unknown {
  if (typeof value === 'string') {
    if (value.length > 200) return `${value.slice(0, 80)}…[truncated]`;
    if (SENSITIVE.test(value)) return '[redacted]';
    return value;
  }
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = SENSITIVE.test(key) ? '[redacted]' : sanitize(nested);
    }
    return out;
  }
  return value;
}

function write(level: LogLevel, message: string, meta?: unknown) {
  if (!__DEV__ && level === 'debug') return;

  const payload = meta === undefined ? undefined : sanitize(meta);
  const args = payload === undefined ? [message] : [message, payload];

  switch (level) {
    case 'debug':
    case 'info':
      if (__DEV__) console.log(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    case 'error':
      console.error(...args);
      break;
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => write('debug', message, meta),
  info: (message: string, meta?: unknown) => write('info', message, meta),
  warn: (message: string, meta?: unknown) => write('warn', message, meta),
  error: (message: string, meta?: unknown) => write('error', message, meta),
};
