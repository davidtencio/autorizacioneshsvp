import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';

interface DeleteTarget {
  type: 'medication' | 'patient' | 'prescriber';
  id: number | string;
  name: string;
  parentId?: number | string;
}

interface UseDeleteConfirmationParams {
  deleteTarget: DeleteTarget | null;
  setIsDeleteModalOpen: (open: boolean) => void;
  setDeleteTarget: (target: DeleteTarget | null) => void;
  deleteMedication: (id: string | number) => Promise<void>;
  deletePatient: (patientId: number | string, medId: number | string) => Promise<void>;
  deletePrescriber: (id: number | string) => Promise<void>;
  addToast: (message: string, type: 'success' | 'error') => void;
}

/**
 * Orchestrates the delete confirmation flow: dispatches by target type,
 * navigates home after deleting a medication, and always resets the modal
 * state. Per-mutation error logging stays inside the underlying hooks; this
 * wrapper just guarantees the modal closes and a generic toast fires for
 * the medication/prescriber paths (the patient path manages its own toast).
 */
export function useDeleteConfirmation({
  deleteTarget,
  setIsDeleteModalOpen,
  setDeleteTarget,
  deleteMedication,
  deletePatient,
  deletePrescriber,
  addToast,
}: UseDeleteConfirmationParams) {
  const navigate = useNavigate();

  return useCallback(async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'medication') {
        await deleteMedication(deleteTarget.id);
        navigate('/');
        addToast('Medicamento eliminado', 'success');
      } else if (deleteTarget.type === 'patient' && deleteTarget.parentId !== undefined) {
        await deletePatient(deleteTarget.id, deleteTarget.parentId);
      } else if (deleteTarget.type === 'prescriber') {
        await deletePrescriber(deleteTarget.id);
        addToast('Prescriptor eliminado', 'success');
      }
    } catch (err) {
      logger.error('delete_confirmation_failed', {
        targetType: deleteTarget.type,
        id: deleteTarget.id,
        error: String(err),
      });
      addToast('Error al eliminar', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
    }
  }, [
    deleteTarget,
    setIsDeleteModalOpen,
    setDeleteTarget,
    deleteMedication,
    deletePatient,
    deletePrescriber,
    addToast,
    navigate,
  ]);
}
