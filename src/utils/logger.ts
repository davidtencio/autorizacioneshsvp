const DEV = import.meta.env.DEV;
const ENABLE_REMOTE_LOGS = import.meta.env.PROD;
let remoteLogFailed = false;
let remoteLogCount = 0;
const REMOTE_LOG_CAP_PER_SESSION = 50;

type LogMeta = Record<string, unknown>;
type LogLevel = 'info' | 'warn' | 'error';

const MAX_MESSAGE_LEN = 500;
const MAX_META_BYTES = 4000;

// One traceId per page load; lets us correlate logs from the same session.
const sessionTraceId = (() => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(36).slice(2, 10);
})();

// Auth context is set asynchronously after sign-in. The logger stays usable
// before that (uid simply omitted from the payload).
let currentUid: string | null = null;
export function setLoggerUid(uid: string | null): void {
  currentUid = uid;
}

export function getSessionTraceId(): string {
  return sessionTraceId;
}

function clampString(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

function sanitizeMeta(meta: LogMeta | undefined): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  try {
    const json = JSON.stringify(meta);
    if (json.length <= MAX_META_BYTES) return JSON.parse(json) as Record<string, unknown>;
    return { truncated: true, preview: clampString(json, MAX_META_BYTES) };
  } catch {
    return { truncated: true, reason: 'serialization_failed' };
  }
}

function emit(level: LogLevel, message: string, meta?: LogMeta): void {
  const safeMessage = clampString(message, MAX_MESSAGE_LEN);
  const safeMeta = sanitizeMeta({
    ...(meta ?? {}),
    traceId: sessionTraceId,
    ...(currentUid ? { uid: currentUid } : {}),
  });
  const payload = {
    ts: new Date().toISOString(),
    level,
    message: safeMessage,
    ...(safeMeta ? { meta: safeMeta } : {}),
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
  if (remoteLogCount >= REMOTE_LOG_CAP_PER_SESSION) return;
  remoteLogCount += 1;
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
