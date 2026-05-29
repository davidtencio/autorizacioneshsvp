import { useCallback } from 'react';
import type { Medication } from '../types';

interface DeleteTargetSetter {
    (target: { type: 'medication'; id: number | string; name: string } | null): void;
}

interface UseMedicationActionsParams {
    editingId: number | string | null;
    setEditingId: (id: number | string | null) => void;
    setIsMedModalOpen: (isOpen: boolean) => void;
    setDeleteTarget: DeleteTargetSetter;
    setIsDeleteModalOpen: (isOpen: boolean) => void;
    addMedication: (med: Omit<Medication, 'id'>) => Promise<void>;
    updateMedication: (id: string | number, updates: Partial<Medication>) => Promise<void>;
    addToast: (message: string, type: 'success' | 'error') => void;
}

export const useMedicationActions = ({
    editingId,
    setEditingId,
    setIsMedModalOpen,
    setDeleteTarget,
    setIsDeleteModalOpen,
    addMedication,
    updateMedication,
    addToast
}: UseMedicationActionsParams) => {
    const handleEditMed = useCallback((med: Medication) => {
        setEditingId(med.id);
        setIsMedModalOpen(true);
    }, [setEditingId, setIsMedModalOpen]);

    const handleDeleteMedClick = useCallback((med: Medication) => {
        setDeleteTarget({ type: 'medication', id: med.id, name: med.name });
        setIsDeleteModalOpen(true);
    }, [setDeleteTarget, setIsDeleteModalOpen]);

    const handleAddMedication = useCallback(async (data: Partial<Medication>) => {
        if (!data.name) return;

        try {
            if (editingId) {
                await updateMedication(editingId, data);
                addToast('Medicamento actualizado', 'success');
            } else {
                await addMedication({
                    code: data.code || '',
                    name: data.name,
                    strength: data.strength || '',
                    route: data.route || 'Oral',
                    category: data.category || 'Almacenable',
                    type: 'General',
                    patientsSummary: { count: 0, lastUpdated: new Date().toISOString().slice(0, 10) },
                });
                addToast('Medicamento creado con éxito', 'success');
            }

            setIsMedModalOpen(false);
            setEditingId(null);
        } catch (error) {
            console.error(error);
            addToast('Error al guardar medicamento', 'error');
        }
    }, [editingId, updateMedication, addMedication, addToast, setIsMedModalOpen, setEditingId]);

    return {
        handleEditMed,
        handleDeleteMedClick,
        handleAddMedication
    };
};
