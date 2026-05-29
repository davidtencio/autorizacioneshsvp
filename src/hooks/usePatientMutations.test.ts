import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import type { Medication, Patient } from '../types';

const commitMock = vi.fn();
const setPatientRefMock = vi.fn();
const setMedRefMock = vi.fn();
const deleteRefMock = vi.fn();

const writeBatchMock = vi.fn(() => ({
  set: (...args: unknown[]) => setPatientRefMock(...args),
  update: (...args: unknown[]) => setMedRefMock(...args),
  delete: (...args: unknown[]) => deleteRefMock(...args),
  commit: commitMock,
}));

vi.mock('firebase/firestore', () => ({
  writeBatch: () => writeBatchMock(),
  doc: (...args: unknown[]) => ({ path: args.join('/') }),
}));

vi.mock('../firebase/firestore', () => ({ db: {} as unknown }));

const tracedCommitMock = vi.fn(async (_op: string, batch: { commit: () => Promise<void> }) => {
  await batch.commit();
});
vi.mock('../services/tracedCommit', () => ({
  tracedCommit: (...args: Parameters<typeof tracedCommitMock>) => tracedCommitMock(...args),
}));

import { usePatientMutations } from './usePatientMutations';

const patient = (overrides: Partial<Patient> = {}): Patient => ({
  id: 1,
  identificationNumber: '1',
  name: 'NEW',
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

const med = (patients: Patient[] = []): Medication => ({
  id: 'm1',
  code: '1-1',
  name: 'MED',
  strength: '10mg',
  route: 'IV',
  type: 'General',
  patients,
});

function setup(medications: Medication[] = [med()]) {
  const setPatientsForMedication = vi.fn();
  const addToast = vi.fn();
  const onAddSuccess = vi.fn();
  const hook = renderHook(() =>
    usePatientMutations({
      medications,
      setPatientsForMedication,
      addToast,
      editingPatientId: null,
      isRenewing: false,
      onAddSuccess,
    })
  );
  return { hook, setPatientsForMedication, addToast, onAddSuccess };
}

describe('usePatientMutations', () => {
  beforeEach(() => {
    commitMock.mockReset();
    setPatientRefMock.mockReset();
    setMedRefMock.mockReset();
    deleteRefMock.mockReset();
    tracedCommitMock.mockClear();
    writeBatchMock.mockClear();
  });

  it('addOrUpdatePatient: success writes batch + success toast + onAddSuccess', async () => {
    commitMock.mockResolvedValue(undefined);
    const { hook, setPatientsForMedication, addToast, onAddSuccess } = setup();
    await act(async () => {
      await hook.result.current.addOrUpdatePatient(patient({ id: 0 }), 'm1');
    });
    expect(setPatientsForMedication).toHaveBeenCalled();
    expect(commitMock).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('agregado'), 'success');
    expect(onAddSuccess).toHaveBeenCalled();
  });

  it('addOrUpdatePatient: failure rolls back and shows error toast', async () => {
    commitMock.mockRejectedValue(new Error('rules-denied'));
    const { hook, setPatientsForMedication, addToast, onAddSuccess } = setup();
    await act(async () => {
      await hook.result.current.addOrUpdatePatient(patient({ id: 0 }), 'm1');
    });
    expect(setPatientsForMedication).toHaveBeenCalledTimes(2);
    expect(setPatientsForMedication.mock.calls[1]).toEqual(['m1', []]);
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('Error'), 'error');
    expect(onAddSuccess).not.toHaveBeenCalled();
  });

  it('addOrUpdatePatient: empty name short-circuits without commit or toast', async () => {
    const { hook, addToast } = setup();
    await act(async () => {
      await hook.result.current.addOrUpdatePatient(patient({ name: '' }), 'm1');
    });
    expect(commitMock).not.toHaveBeenCalled();
    expect(addToast).not.toHaveBeenCalled();
  });

  it('addOrUpdatePatient: unknown medication shows error toast', async () => {
    const { hook, addToast } = setup();
    await act(async () => {
      await hook.result.current.addOrUpdatePatient(patient(), 'unknown-id');
    });
    expect(addToast).toHaveBeenCalledWith(expect.stringContaining('no encontrado'), 'error');
    expect(commitMock).not.toHaveBeenCalled();
  });

  it('deletePatient: success removes patient and fires toast', async () => {
    commitMock.mockResolvedValue(undefined);
    const initial = med([patient({ id: 5, name: 'OLD' })]);
    const { hook, setPatientsForMedication, addToast } = setup([initial]);
    await act(async () => {
      await hook.result.current.deletePatient(5, 'm1');
    });
    expect(deleteRefMock).toHaveBeenCalled();
    expect(commitMock).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('Paciente eliminado', 'success');
    expect(setPatientsForMedication).toHaveBeenCalledTimes(1);
  });

  it('deletePatient: failure rolls back and shows error toast', async () => {
    commitMock.mockRejectedValue(new Error('boom'));
    const initial = med([patient({ id: 5 })]);
    const { hook, setPatientsForMedication, addToast } = setup([initial]);
    await act(async () => {
      await hook.result.current.deletePatient(5, 'm1');
    });
    expect(setPatientsForMedication).toHaveBeenCalledTimes(2);
    expect(setPatientsForMedication.mock.calls[1]?.[1]).toEqual(initial.patients);
    expect(addToast).toHaveBeenCalledWith('Error al eliminar', 'error');
  });

  it('suspendPatient: success fires toast with reason', async () => {
    commitMock.mockResolvedValue(undefined);
    const initial = med([patient({ id: 5 })]);
    const { hook, addToast } = setup([initial]);
    await act(async () => {
      await hook.result.current.suspendPatient(initial.patients![0]!, 'm1', 'Efecto adverso');
    });
    expect(commitMock).toHaveBeenCalled();
    expect(addToast).toHaveBeenCalledWith('Tratamiento suspendido (Efecto adverso)', 'success');
  });

  it('suspendPatient: failure rolls back and shows error toast', async () => {
    commitMock.mockRejectedValue(new Error('boom'));
    const initial = med([patient({ id: 5 })]);
    const { hook, setPatientsForMedication, addToast } = setup([initial]);
    await act(async () => {
      await hook.result.current.suspendPatient(initial.patients![0]!, 'm1', 'Otro');
    });
    expect(setPatientsForMedication).toHaveBeenCalledTimes(2);
    expect(addToast).toHaveBeenCalledWith('Error al suspender tratamiento', 'error');
  });
});
