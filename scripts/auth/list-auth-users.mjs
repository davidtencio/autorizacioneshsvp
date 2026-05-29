import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'node:fs';

const projectId = process.env.FIREBASE_PROJECT_ID || 'hsvp-autorizaciones-7819d';
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!getApps().length) {
  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({ credential: cert(serviceAccount), projectId });
  } else {
    initializeApp({ credential: applicationDefault(), projectId });
  }
}

const auth = getAuth();

async function main() {
  console.log(`[list-auth] Project: ${projectId}`);
  let nextPageToken;
  const rows = [];
  do {
    const page = await auth.listUsers(1000, nextPageToken);
    for (const u of page.users) {
      rows.push({
        uid: u.uid,
        email: u.email ?? '',
        emailVerified: u.emailVerified,
        provider: u.providerData.map((p) => p.providerId).join(',') || 'anonymous',
        disabled: u.disabled,
        lastSignInTime: u.metadata.lastSignInTime ?? '',
        creationTime: u.metadata.creationTime ?? '',
      });
    }
    nextPageToken = page.pageToken;
  } while (nextPageToken);

  rows.sort((a, b) => (b.lastSignInTime > a.lastSignInTime ? 1 : -1));

  console.log(`[list-auth] Total users: ${rows.length}`);
  console.log('');
  console.log('uid\temail\tprovider\tdisabled\tlastSignIn\tcreated');
  for (const r of rows) {
    console.log(
      `${r.uid}\t${r.email}\t${r.provider}\t${r.disabled}\t${r.lastSignInTime}\t${r.creationTime}`
    );
  }
}

main().catch((err) => {
  console.error('[list-auth] Failed:', err);
  process.exit(1);
});
