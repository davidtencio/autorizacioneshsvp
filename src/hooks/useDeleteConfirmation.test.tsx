import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import { useDeleteConfirmation } from './useDeleteConfirmation';

interface DeleteTarget {
  type: 'medication' | 'patient' | 'prescriber';
  id: number | string;
  name: string;
  parentId?: number | string;
}

const wrapper = ({ children }: { children: ReactNode }) => <MemoryRouter>{children}</MemoryRouter>;

function setup(target: DeleteTarget | null) {
  const setIsDeleteModalOpen = vi.fn();
  const setDeleteTarget = vi.fn();
  const deleteMedication = vi.fn().mockResolvedValue(undefined);
  const deletePatient = vi.fn().mockResolvedValue(undefined);
  const deletePrescriber = vi.fn().mockResolvedValue(undefined);
  const addToast = vi.fn();
  const hook = renderHook(
    () =>
      useDeleteConfirmation({
        deleteTarget: target,
        setIsDeleteModalOpen,
        setDeleteTarget,
        deleteMedication,
        deletePatient,
        deletePrescriber,
        addToast,
      }),
    { wrapper }
  );
  return {
    confirm: hook.result.current,
    setIsDeleteModalOpen,
    setDeleteTarget,
    deleteMedication,
    deletePatient,
    deletePrescriber,
    addToast,
  };
}

describe('useDeleteConfirmation', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('returns a no-op when deleteTarget is null', async () => {
    const { confirm, deleteMedication, deletePatient, deletePrescriber, addToast } = setup(null);
    await act(async () => {
      await confirm();
    });
    expect(deleteMedication).not.toHaveBeenCalled();
    expect(deletePatient).not.toHaveBeenCalled();
    expect(deletePrescriber).not.toHaveBeenCalled();
    expect(addToast).not.toHaveBeenCalled();
  });

  it('medication: deletes, navigates home, fires success toast, closes modal', async () => {
    const { confirm, deleteMedication, setIsDeleteModalOpen, setDeleteTarget, addToast } = setup({
      type: 'medication',
      id: 'med-1',
      name: 'X',
    });
    await act(async () => {
      await confirm();
    });
    expect(deleteMedication).toHaveBeenCalledWith('med-1');
    expect(navigateMock).toHaveBeenCalledWith('/');
    expect(addToast).toHaveBeenCalledWith('Medicamento eliminado', 'success');
    expect(setIsDeleteModalOpen).toHaveBeenCalledWith(false);
    expect(setDeleteTarget).toHaveBeenCalledWith(null);
  });

  it('patient: delegates to deletePatient with parentId', async () => {
    const { confirm, deletePatient } = setup({
      type: 'patient',
      id: 7,
      name: 'P',
      parentId: 'med-1',
    });
    await act(async () => {
      await confirm();
    });
    expect(deletePatient).toHaveBeenCalledWith(7, 'med-1');
  });

  it('patient: missing parentId is a no-op for deletePatient but still closes modal', async () => {
    const { confirm, deletePatient, setIsDeleteModalOpen, setDeleteTarget } = setup({
      type: 'patient',
      id: 7,
      name: 'P',
    });
    await act(async () => {
      await confirm();
    });
    expect(deletePatient).not.toHaveBeenCalled();
    expect(setIsDeleteModalOpen).toHaveBeenCalledWith(false);
    expect(setDeleteTarget).toHaveBeenCalledWith(null);
  });

  it('prescriber: deletes and fires success toast', async () => {
    const { confirm, deletePrescriber, addToast } = setup({
      type: 'prescriber',
      id: 'pr-1',
      name: 'Dr',
    });
    await act(async () => {
      await confirm();
    });
    expect(deletePrescriber).toHaveBeenCalledWith('pr-1');
    expect(addToast).toHaveBeenCalledWith('Prescriptor eliminado', 'success');
  });

  it('error: closes modal and shows error toast', async () => {
    const setIsDeleteModalOpen = vi.fn();
    const setDeleteTarget = vi.fn();
    const deleteMedication = vi.fn().mockRejectedValue(new Error('nope'));
    const addToast = vi.fn();
    const hook = renderHook(
      () =>
        useDeleteConfirmation({
          deleteTarget: { type: 'medication', id: 'med-1', name: 'X' },
          setIsDeleteModalOpen,
          setDeleteTarget,
          deleteMedication,
          deletePatient: vi.fn(),
          deletePrescriber: vi.fn(),
          addToast,
        }),
      { wrapper }
    );
    await act(async () => {
      await hook.result.current();
    });
    expect(addToast).toHaveBeenCalledWith('Error al eliminar', 'error');
    expect(setIsDeleteModalOpen).toHaveBeenCalledWith(false);
    expect(setDeleteTarget).toHaveBeenCalledWith(null);
  });
});
