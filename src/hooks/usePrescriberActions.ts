import { useCallback, useMemo } from 'react';
import type { Prescriber } from '../types';
import { logger } from '../utils/logger';

interface FirebaseLikeError {
  code?: string;
}

interface DeleteTargetSetter {
    (target: { type: 'prescriber'; id: number | string; name: string } | null): void;
}

interface UsePrescriberActionsParams {
    editingPrescriberId: number | string | null;
    setEditingPrescriberId: (id: number | string | null) => void;
    setIsPrescriberModalOpen: (isOpen: boolean) => void;
    setIsPrescribersListOpen: (isOpen: boolean) => void;
    setIsDeleteModalOpen: (isOpen: boolean) => void;
    setDeleteTarget: DeleteTargetSetter;
    addPrescriber: (data: Omit<Prescriber, 'id'>) => Promise<void>;
    updatePrescriber: (id: number | string, data: Partial<Prescriber>) => Promise<void>;
    addToast: (message: string, type: 'success' | 'error') => void;
}

export const usePrescriberActions = ({
    editingPrescriberId,
    setEditingPrescriberId,
    setIsPrescriberModalOpen,
    setIsPrescribersListOpen,
    setIsDeleteModalOpen,
    setDeleteTarget,
    addPrescriber,
    updatePrescriber,
    addToast
}: UsePrescriberActionsParams) => {
    const handleAddPrescriber = useCallback(async (data: Partial<Prescriber>) => {
        if (!data.name || !data.specialty) return;

        try {
            if (editingPrescriberId) {
                await updatePrescriber(editingPrescriberId, {
                    name: data.name,
                    specialty: data.specialty
                });
                addToast('Prescriptor actualizado', 'success');
            } else {
                await addPrescriber({
                    name: data.name,
                    specialty: data.specialty
                });
                addToast('Prescriptor agregado', 'success');
            }

            setEditingPrescriberId(null);
            setIsPrescriberModalOpen(false);
            setIsPrescribersListOpen(true);
        } catch (error) {
            const code = (error as FirebaseLikeError)?.code;
            logger.error('save_prescriber_failed', { editingPrescriberId, code, error: String(error) });
            if (code === 'permission-denied') {
                addToast('Permisos insuficientes para agregar prescriptor', 'error');
            } else {
                addToast('Error al agregar prescriptor', 'error');
            }
        }
    }, [
        editingPrescriberId,
        updatePrescriber,
        addPrescriber,
        addToast,
        setEditingPrescriberId,
        setIsPrescriberModalOpen,
        setIsPrescribersListOpen
    ]);

    const prescriberActions = useMemo(() => ({
        add: () => {
            setEditingPrescriberId(null);
            setIsPrescribersListOpen(false);
            setIsPrescriberModalOpen(true);
        },
        edit: (prescriber: Prescriber) => {
            setEditingPrescriberId(prescriber.id);
            setIsPrescribersListOpen(false);
            setIsPrescriberModalOpen(true);
        },
        delete: (prescriber: Prescriber) => {
            setDeleteTarget({ type: 'prescriber', id: prescriber.id, name: prescriber.name });
            setIsDeleteModalOpen(true);
        }
    }), [
        setEditingPrescriberId,
        setIsPrescribersListOpen,
        setIsPrescriberModalOpen,
        setDeleteTarget,
        setIsDeleteModalOpen
    ]);

    return {
        handleAddPrescriber,
        prescriberActions
    };
};
