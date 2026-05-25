import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import type { Medication, Patient } from '../types';

const patientCollection = (db: Firestore, medicationId: string) =>
  collection(db, 'medications', medicationId, 'patients');

const patientDoc = (db: Firestore, medicationId: string, patientId: number) =>
  doc(db, 'medications', medicationId, 'patients', String(patientId));

export const fetchPatientsByMedication = async (db: Firestore, medicationId: string): Promise<Patient[]> => {
  const snapshot = await getDocs(patientCollection(db, medicationId));
  return snapshot.docs
    .map((d) => d.data() as Patient)
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
};

export const upsertPatientInSubcollection = async (
  db: Firestore,
  medicationId: string,
  patient: Patient
): Promise<void> => {
  await setDoc(patientDoc(db, medicationId, patient.id), patient, { merge: true });
};

export const deletePatientFromSubcollection = async (
  db: Firestore,
  medicationId: string,
  patientId: number
): Promise<void> => {
  await deleteDoc(patientDoc(db, medicationId, patientId));
};

export const backfillMedicationPatients = async (
  db: Firestore,
  medication: Medication
): Promise<void> => {
  if (!Array.isArray(medication.patients) || medication.patients.length === 0) return;
  const batch = writeBatch(db);
  for (const patient of medication.patients) {
    batch.set(patientDoc(db, String(medication.id), patient.id), patient, { merge: true });
  }
  await batch.commit();
};
