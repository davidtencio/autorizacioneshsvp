import { logger } from '../utils/logger';

let installed = false;

/**
 * Installs window-level error listeners that funnel uncaught exceptions and
 * unhandled Promise rejections through the structured logger. Idempotent.
 */
export function installGlobalErrorHandlers(): void {
  if (installed) return;
  installed = true;

  window.addEventListener('error', (event) => {
    const err = event.error as unknown;
    logger.error('window_error', {
      message: event.message,
      source: event.filename,
      line: event.lineno,
      column: event.colno,
      stack: err instanceof Error ? err.stack : undefined,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as unknown;
    logger.error('unhandled_rejection', {
      message: reason instanceof Error ? reason.message : String(reason ?? ''),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });
}
