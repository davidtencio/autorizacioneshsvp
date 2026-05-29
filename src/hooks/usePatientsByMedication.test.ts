import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Medication, Patient } from '../types';

const fetchPatientsByMedicationMock = vi.fn();

vi.mock('../services/patientStore', () => ({
  fetchPatientsByMedication: (...args: unknown[]) => fetchPatientsByMedicationMock(...args),
}));

vi.mock('../firebase/firestore', () => ({
  db: {} as unknown,
}));

import { usePatientsByMedication } from './usePatientsByMedication';

const med = (overrides: Partial<Medication> = {}): Medication => ({
  id: 'm1',
  code: '1-1',
  name: 'MED',
  strength: '10mg',
  route: 'IV',
  type: 'General',
  patients: [],
  ...overrides,
});

const patient = (overrides: Partial<Patient> = {}): Patient => ({
  id: 1,
  identificationNumber: '1',
  name: 'A',
  diagnosis: 'd',
  authorizationCode: 'c',
  issuer: 'CCF',
  startMonth: '01/2026',
  endMonth: '12/2026',
  dose: '1',
  frequency: 'q',
  route: 'IV',
  totalCycles: '1',
  totalMonths: '1',
  applicationPlace: 'X',
  prescriber: 'p',
  specialty: 's',
  ...overrides,
});

describe('usePatientsByMedication', () => {
  beforeEach(() => {
    fetchPatientsByMedicationMock.mockReset();
  });

  it('fetches subcollection for each medication on mount', async () => {
    fetchPatientsByMedicationMock.mockResolvedValue([patient({ id: 7 })]);
    const medications = [med({ id: 'm1' }), med({ id: 'm2' })];

    const { result } = renderHook(({ meds }) => usePatientsByMedication(meds), {
      initialProps: { meds: medications },
    });

    await waitFor(() => {
      expect(fetchPatientsByMedicationMock).toHaveBeenCalledTimes(2);
    });
    expect(fetchPatientsByMedicationMock).toHaveBeenCalledWith(expect.anything(), 'm1');
    expect(fetchPatientsByMedicationMock).toHaveBeenCalledWith(expect.anything(), 'm2');
    await waitFor(() => {
      expect(result.current.medicationsWithPatients[0]?.patients).toHaveLength(1);
    });
  });

  it('does NOT refetch already-seen medications when list re-renders', async () => {
    fetchPatientsByMedicationMock.mockResolvedValue([]);
    const initial = [med({ id: 'm1' })];
    const { rerender } = renderHook(({ meds }) => usePatientsByMedication(meds), {
      initialProps: { meds: initial },
    });

    await waitFor(() => {
      expect(fetchPatientsByMedicationMock).toHaveBeenCalledTimes(1);
    });

    // Re-render with same content but new identity.
    rerender({ meds: [med({ id: 'm1' })] });
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchPatientsByMedicationMock).toHaveBeenCalledTimes(1);
  });

  it('fetches only the newly added medication', async () => {
    fetchPatientsByMedicationMock.mockResolvedValue([]);
    const { rerender } = renderHook(({ meds }) => usePatientsByMedication(meds), {
      initialProps: { meds: [med({ id: 'm1' })] },
    });
    await waitFor(() => expect(fetchPatientsByMedicationMock).toHaveBeenCalledTimes(1));

    rerender({ meds: [med({ id: 'm1' }), med({ id: 'm2' })] });
    await waitFor(() => expect(fetchPatientsByMedicationMock).toHaveBeenCalledTimes(2));
    expect(fetchPatientsByMedicationMock).toHaveBeenLastCalledWith(expect.anything(), 'm2');
  });

  it('setPatientsForMedication replaces patients for a single med', async () => {
    fetchPatientsByMedicationMock.mockResolvedValue([]);
    const { result } = renderHook(() => usePatientsByMedication([med({ id: 'm1' })]));

    await waitFor(() => expect(result.current.medicationsWithPatients[0]?.patients).toEqual([]));

    act(() => {
      result.current.setPatientsForMedication('m1', [patient({ id: 99 })]);
    });

    expect(result.current.patientsByMedication['m1']).toHaveLength(1);
    expect(result.current.medicationsWithPatients[0]?.patients?.[0]?.id).toBe(99);
  });

  it('survives a fetch error without setting patients', async () => {
    fetchPatientsByMedicationMock.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => usePatientsByMedication([med({ id: 'm1' })]));

    await waitFor(() => expect(fetchPatientsByMedicationMock).toHaveBeenCalled());
    expect(result.current.patientsByMedication['m1']).toBeUndefined();
    expect(result.current.medicationsWithPatients[0]?.patients).toEqual([]);
  });
});
