const DEV = import.meta.env.DEV;

type LogMeta = Record<string, unknown>;

function emit(level: 'info' | 'warn' | 'error', message: string, meta?: LogMeta): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };

  if (level === 'error') {
    console.error(payload);
    return;
  }

  if (level === 'warn') {
    console.warn(payload);
    return;
  }

  if (DEV) {
    console.info(payload);
  }
}

export const logger = {
  info: (message: string, meta?: LogMeta) => emit('info', message, meta),
  warn: (message: string, meta?: LogMeta) => emit('warn', message, meta),
  error: (message: string, meta?: LogMeta) => emit('error', message, meta),
};
