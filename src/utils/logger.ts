const DEV = import.meta.env.DEV;
const ENABLE_REMOTE_LOGS = import.meta.env.PROD;
let remoteLogFailed = false;

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
    if (ENABLE_REMOTE_LOGS) {
      void writeRemoteError(payload);
    }
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

async function writeRemoteError(payload: Record<string, unknown>): Promise<void> {
  if (remoteLogFailed) return;
  try {
    const [{ db }, { addDoc, collection }] = await Promise.all([
      import('../firebase/firestore'),
      import('firebase/firestore'),
    ]);
    await addDoc(collection(db, 'ops_logs'), payload);
  } catch {
    remoteLogFailed = true;
  }
}

export const logger = {
  info: (message: string, meta?: LogMeta) => emit('info', message, meta),
  warn: (message: string, meta?: LogMeta) => emit('warn', message, meta),
  error: (message: string, meta?: LogMeta) => emit('error', message, meta),
};
