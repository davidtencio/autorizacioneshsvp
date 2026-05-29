import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import type { Patient, PatientsSummary } from '../types';

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

export const buildPatientsSummary = (patients: Patient[]): PatientsSummary => {
  let lastUpdated = '';
  for (const p of patients) {
    const candidates = [p.suspensionDate, p.endMonth, p.startMonth].filter(
      (v): v is string => typeof v === 'string' && v.length > 0
    );
    for (const c of candidates) {
      if (c > lastUpdated) lastUpdated = c;
    }
  }
  return {
    count: patients.length,
    lastUpdated: lastUpdated || new Date().toISOString().slice(0, 10),
  };
};

