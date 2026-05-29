import type { WriteBatch } from 'firebase/firestore';
import { logger } from '../utils/logger';

interface FirestoreLikeError {
  code?: string | undefined;
  message?: string | undefined;
  name?: string | undefined;
}

function describeError(err: unknown): FirestoreLikeError {
  if (err && typeof err === 'object') {
    const e = err as FirestoreLikeError;
    return {
      code: typeof e.code === 'string' ? e.code : undefined,
      message: typeof e.message === 'string' ? e.message : String(err),
      name: typeof e.name === 'string' ? e.name : undefined,
    };
  }
  return { message: String(err) };
}

/**
 * Wraps batch.commit() with structured logging:
 *  - logs latency on success (info, dev only)
 *  - logs error with Firestore code on failure (warn level: handled by caller)
 *  - rethrows so the caller can still react (rollback, toast, etc.)
 *
 * `op` is a short identifier (e.g. 'addPatient', 'deletePatient'). `context`
 * carries any caller-meaningful ids (medId, patientId, count) that help
 * correlate logs across sessions.
 */
export async function tracedCommit(
  op: string,
  batch: WriteBatch,
  context: Record<string, unknown> = {}
): Promise<void> {
  const start = performance.now();
  try {
    await batch.commit();
    const durationMs = Math.round(performance.now() - start);
    logger.info('firestore_commit_ok', { op, durationMs, ...context });
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    const info = describeError(err);
    logger.error('firestore_commit_failed', {
      op,
      durationMs,
      code: info.code,
      message: info.message,
      name: info.name,
      ...context,
    });
    throw err;
  }
}
