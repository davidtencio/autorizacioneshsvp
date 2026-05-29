import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { db } from '../firebase/firestore';
import { fetchPatientsByMedication } from '../services/patientStore';
import { logger } from '../utils/logger';
import type { Medication, Patient } from '../types';

interface UsePatientsByMedicationResult {
  /**
   * Map medId -> Patient[] hydrated from the subcollection.
   * `medication.patients` falls through this map in `medicationsWithPatients`.
   */
  patientsByMedication: Record<string, Patient[]>;
  /**
   * Replace the patients array for a single medication (used by mutation
   * handlers to apply optimistic updates and rollbacks).
   */
  setPatientsForMedication: (medId: string, patients: Patient[]) => void;
  /**
   * Read-through helper that merges each medication doc with its hydrated
   * patient list. Stable identity per (medications, patientsByMedication)
   * change.
   */
  medicationsWithPatients: Medication[];
}

/**
 * Watches the list of medications and lazily fetches each one's `patients`
 * subcollection the first time it appears. Caches the patient arrays by
 * medication id and exposes a setter for mutations to update/roll back
 * optimistically.
 */
export function usePatientsByMedication(
  medications: Medication[]
): UsePatientsByMedicationResult {
  const [patientsByMedication, setPatientsByMedication] = useState<
    Record<string, Patient[]>
  >({});
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newMedIds = medications
      .map((m) => String(m.id))
      .filter((id) => !fetchedIdsRef.current.has(id));
    if (newMedIds.length === 0) return;
    newMedIds.forEach(async (medId) => {
      fetchedIdsRef.current.add(medId);
      try {
        const patients = await fetchPatientsByMedication(db, medId);
        setPatientsByMedication((prev) => ({ ...prev, [medId]: patients }));
      } catch (err) {
        logger.error('patients_subcollection_fetch_failed', {
          medId,
          error: String(err),
        });
      }
    });
  }, [medications]);

  const setPatientsForMedication = useCallback(
    (medId: string, patients: Patient[]) => {
      setPatientsByMedication((prev) => ({ ...prev, [medId]: patients }));
    },
    []
  );

  const medicationsWithPatients = useMemo(
    () =>
      medications.map((med) => ({
        ...med,
        patients: patientsByMedication[String(med.id)] ?? [],
      })),
    [medications, patientsByMedication]
  );

  return {
    patientsByMedication,
    setPatientsForMedication,
    medicationsWithPatients,
  };
}
