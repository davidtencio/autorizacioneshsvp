const BASE_URL = process.env.SMOKE_BASE_URL || process.env.FIREBASE_HOSTING_URL || 'https://hsvp-autorizaciones-7819d.web.app';
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 10000);

function timeoutSignal(ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function check(path) {
  const url = new URL(path, BASE_URL).toString();
  const t = timeoutSignal(TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: t.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} on ${url}`);
    }
  } finally {
    t.clear();
  }
}

(async () => {
  try {
    await check('/');
    await check('/index.html');
    console.log(`[smoke] OK ${BASE_URL}`);
  } catch (err) {
    console.error('[smoke] FAILED', err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();
