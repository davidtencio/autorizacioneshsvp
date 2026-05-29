import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const projectId = process.env.FIREBASE_PROJECT_ID || 'hsvp-autorizaciones-7819d';
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const apply = process.argv.includes('--apply');
const rolesFile = (() => {
  const idx = process.argv.indexOf('--roles');
  return idx > -1 ? process.argv[idx + 1] : null;
})();

if (!rolesFile) {
  console.error(
    'Usage: node scripts/auth/seed-user-roles.mjs --roles path/to/roles.json [--apply]\n' +
      '\nroles.json format:\n' +
      '  { "byEmail": { "user@example.com": "admin" | "editor" | "viewer", ... } }'
  );
  process.exit(1);
}

const VALID_ROLES = new Set(['admin', 'editor', 'viewer']);

if (!getApps().length) {
  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({ credential: cert(serviceAccount), projectId });
  } else {
    initializeApp({ credential: applicationDefault(), projectId });
  }
}

const auth = getAuth();
const db = getFirestore();

async function main() {
  const config = JSON.parse(readFileSync(rolesFile, 'utf8'));
  const byEmail = config.byEmail ?? {};
  const entries = Object.entries(byEmail);

  console.log(`[seed-roles] Mode: ${apply ? 'APPLY' : 'DRY-RUN'}  Project: ${projectId}`);
  console.log(`[seed-roles] Entries: ${entries.length}`);

  const planned = [];
  for (const [email, role] of entries) {
    if (!VALID_ROLES.has(role)) {
      console.error(`[seed-roles] SKIP ${email}: invalid role "${role}"`);
      continue;
    }
    try {
      const user = await auth.getUserByEmail(email);
      planned.push({ uid: user.uid, email, role });
    } catch (err) {
      console.error(`[seed-roles] SKIP ${email}: not found in Auth (${err.code ?? err.message})`);
    }
  }

  console.log('');
  console.log('uid\temail\trole');
  for (const p of planned) {
    console.log(`${p.uid}\t${p.email}\t${p.role}`);
  }
  console.log('');

  if (!apply) {
    console.log('[seed-roles] Dry-run complete. Re-run with --apply to write users/{uid}.');
    return;
  }

  for (const p of planned) {
    await db.doc(`users/${p.uid}`).set(
      {
        email: p.email,
        role: p.role,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    console.log(`[seed-roles] wrote users/${p.uid} (${p.email} = ${p.role})`);
  }
  console.log('[seed-roles] Done. Idempotent — safe to re-run.');
}

main().catch((err) => {
  console.error('[seed-roles] Failed:', err);
  process.exit(1);
});
