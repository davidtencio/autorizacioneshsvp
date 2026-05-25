import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'hsvp-autorizaciones-7819d',
  appId: '1:620052027670:web:b7b8548e3465b6cbe45837',
  storageBucket: 'hsvp-autorizaciones-7819d.firebasestorage.app',
  apiKey: 'AIzaSyARt9u11esaE4ILz4T-A17CCR0HMyp7UGE',
  authDomain: 'hsvp-autorizaciones-7819d.firebaseapp.com',
  messagingSenderId: '620052027670',
  measurementId: 'G-P5TXJVEDVC',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function main() {
  console.log('[migration] Starting backfill medications[].patients -> medications/{medId}/patients/{patientId}');

  const medsSnap = await getDocs(collection(db, 'medications'));
  let medsProcessed = 0;
  let patientsWritten = 0;

  for (const medDoc of medsSnap.docs) {
    const medData = medDoc.data();
    const patients = Array.isArray(medData.patients) ? medData.patients : [];
    if (patients.length === 0) continue;

    const batch = writeBatch(db);
    for (const patient of patients) {
      if (!patient || patient.id === undefined || patient.id === null) continue;
      const patientRef = doc(db, 'medications', medDoc.id, 'patients', String(patient.id));
      batch.set(patientRef, patient, { merge: true });
      patientsWritten += 1;
    }

    await batch.commit();
    medsProcessed += 1;
    console.log(`[migration] Medication ${medDoc.id}: backfilled ${patients.length} patients`);
  }

  console.log(`[migration] Done. Medications processed: ${medsProcessed}. Patients written: ${patientsWritten}.`);
  console.log('[migration] Idempotent: re-running is safe (set with merge).');
}

main().catch((err) => {
  console.error('[migration] Failed:', err);
  process.exit(1);
});
