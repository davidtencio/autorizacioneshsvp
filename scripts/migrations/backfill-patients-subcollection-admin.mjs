import { initializeApp, applicationDefault, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const projectId = process.env.FIREBASE_PROJECT_ID || 'hsvp-autorizaciones-7819d';
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!getApps().length) {
  if (serviceAccountPath) {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  } else {
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }
}

const db = getFirestore();

async function main() {
  console.log('[migration-admin] Starting backfill medications[].patients -> medications/{medId}/patients/{patientId}');
  console.log(`[migration-admin] Project: ${projectId}`);

  const medsSnap = await db.collection('medications').get();
  let medsProcessed = 0;
  let patientsWritten = 0;

  for (const medDoc of medsSnap.docs) {
    const medData = medDoc.data();
    const patients = Array.isArray(medData.patients) ? medData.patients : [];
    if (patients.length === 0) continue;

    let batch = db.batch();
    let ops = 0;

    for (const patient of patients) {
      if (!patient || patient.id === undefined || patient.id === null) continue;
      const patientRef = db.doc(`medications/${medDoc.id}/patients/${String(patient.id)}`);
      batch.set(patientRef, patient, { merge: true });
      ops += 1;
      patientsWritten += 1;

      if (ops === 450) {
        await batch.commit();
        batch = db.batch();
        ops = 0;
      }
    }

    if (ops > 0) {
      await batch.commit();
    }

    medsProcessed += 1;
    console.log(`[migration-admin] Medication ${medDoc.id}: backfilled ${patients.length} patients`);
  }

  console.log(`[migration-admin] Done. Medications processed: ${medsProcessed}. Patients written: ${patientsWritten}.`);
  console.log('[migration-admin] Idempotent: re-running is safe (set with merge).');
}

main().catch((err) => {
  console.error('[migration-admin] Failed:', err);
  process.exit(1);
});
