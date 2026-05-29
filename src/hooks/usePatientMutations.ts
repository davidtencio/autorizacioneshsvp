import { useCallback } from 'react';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { buildPatientsSummary } from '../services/patientStore';
import { tracedCommit } from '../services/tracedCommit';
import {
  removePatientById,
  suspendPatientTreatment,
  upsertPatient,
} from '../utils/patientOperations';
import { logger } from '../utils/logger';
import type { Medication, Patient } from '../types';

type ToastFn = (message: string, type: 'success' | 'error') => void;

interface UsePatientMutationsParams {
  medications: Medication[];
  setPatientsForMedication: (medId: string, patients: Patient[]) => void;
  addToast: ToastFn;
  editingPatientId: number | string | null;
  isRenewing: boolean;
  onAddSuccess: () => void;
}

function findMed(medications: Medication[], medId: number | string): Medication | undefined {
  return medications.find((m) => m.id === medId);
}

function patientRef(medKey: string, patientId: number | string) {
  return doc(db, 'medications', medKey, 'patients', String(patientId));
}

function medRef(medKey: string) {
  return doc(db, 'medications', medKey);
}

/**
 * Encapsulates the three patient mutations (upsert, suspend, delete).
 * Each one writes the patient doc + the medication's patientsSummary in a
 * single atomic batch, applies an optimistic UI update, and rolls back to
 * the previous state if the commit fails.
 */
export function usePatientMutations({
  medications,
  setPatientsForMedication,
  addToast,
  editingPatientId,
  isRenewing,
  onAddSuccess,
}: UsePatientMutationsParams) {
  const addOrUpdatePatient = useCallback(
    async (patientFormData: Omit<Patient, 'id'>, targetMedId: number | string | null) => {
      if (!patientFormData.name || !targetMedId) return;
      const med = findMed(medications, targetMedId);
      if (!med) return addToast('Error: Medicamento no encontrado', 'error');

      const medKey = String(med.id);
      const previousPatients = med.patients ?? [];

      try {
        const { patients: updatedPatients, action } = upsertPatient({
          patients: previousPatients,
          patientFormData,
          editingPatientId,
          isRenewing,
        });
        const targetPatient = updatedPatients.find(
          (p) => p.id === Number(editingPatientId ?? updatedPatients[updatedPatients.length - 1]?.id)
        );

        setPatientsForMedication(medKey, updatedPatients);
        try {
          if (targetPatient) {
            const batch = writeBatch(db);
            batch.set(patientRef(medKey, targetPatient.id), targetPatient, { merge: true });
            batch.update(medRef(medKey), {
              patientsSummary: buildPatientsSummary(updatedPatients),
            });
            await tracedCommit('upsertPatient', batch, {
              medId: medKey,
              patientId: String(targetPatient.id),
              action,
            });
          }
        } catch (err) {
          setPatientsForMedication(medKey, previousPatients);
          throw err;
        }

        addToast(
          action === 'renewed'
            ? 'Autorizacion renovada'
            : action === 'updated'
              ? 'Paciente actualizado'
              : 'Paciente agregado exitosamente',
          'success'
        );
        onAddSuccess();
      } catch (err) {
        logger.error('upsert_patient_failed', { medId: medKey, error: String(err) });
        addToast('Error al guardar paciente', 'error');
      }
    },
    [medications, setPatientsForMedication, addToast, editingPatientId, isRenewing, onAddSuccess]
  );

  const suspendPatient = useCallback(
    async (patient: Patient, medId: number | string, reason: string, notes?: string) => {
      const med = findMed(medications, medId);
      if (!med) return;
      const medKey = String(med.id);
      const previousPatients = med.patients ?? [];

      try {
        const updated = suspendPatientTreatment(previousPatients, patient.id, reason, notes);
        const suspended = updated.find((p) => p.id === patient.id);

        setPatientsForMedication(medKey, updated);
        try {
          if (suspended) {
            const batch = writeBatch(db);
            batch.set(patientRef(medKey, suspended.id), suspended, { merge: true });
            batch.update(medRef(medKey), {
              patientsSummary: buildPatientsSummary(updated),
            });
            await tracedCommit('suspendPatient', batch, {
              medId: medKey,
              patientId: String(suspended.id),
              reason,
            });
          }
        } catch (err) {
          setPatientsForMedication(medKey, previousPatients);
          throw err;
        }
        addToast(`Tratamiento suspendido (${reason})`, 'success');
      } catch (err) {
        logger.error('suspend_patient_failed', { medId: medKey, error: String(err) });
        addToast('Error al suspender tratamiento', 'error');
      }
    },
    [medications, setPatientsForMedication, addToast]
  );

  const deletePatient = useCallback(
    async (patientId: number | string, medId: number | string) => {
      const med = findMed(medications, medId);
      if (!med) return;
      const medKey = String(med.id);
      const previousPatients = med.patients ?? [];
      const updatedPatients = removePatientById(previousPatients, Number(patientId));

      setPatientsForMedication(medKey, updatedPatients);
      try {
        const batch = writeBatch(db);
        batch.delete(patientRef(medKey, patientId));
        batch.update(medRef(medKey), {
          patientsSummary: buildPatientsSummary(updatedPatients),
        });
        await tracedCommit('deletePatient', batch, {
          medId: medKey,
          patientId: String(patientId),
        });
        addToast('Paciente eliminado', 'success');
      } catch (err) {
        setPatientsForMedication(medKey, previousPatients);
        logger.error('delete_patient_failed', { medId: medKey, error: String(err) });
        addToast('Error al eliminar', 'error');
      }
    },
    [medications, setPatientsForMedication, addToast]
  );

  return { addOrUpdatePatient, suspendPatient, deletePatient };
}
