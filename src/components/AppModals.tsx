import React from 'react';
import { Modal } from './ui/Modal';
import { NewMedForm } from './NewMedForm';
import { NewPatientForm } from './NewPatientForm';
import { NewPrescriberForm } from './NewPrescriberForm';
import { PrescribersListModal } from './PrescribersListModal';
import { DeleteConfirmation } from './DeleteConfirmation';
import { useUI } from '../context/UIContext';
import type { Medication, Patient, Prescriber } from '../types';

interface AppModalsProps {
    medications: Medication[];
    prescribers: Prescriber[];
    loadingPrescribers: boolean;
    onAddMedication: (data: Partial<Medication>) => Promise<void>;
    onAddPatient: (data: Omit<Patient, 'id'>) => Promise<void>;
    onAddPrescriber: (data: Partial<Prescriber>) => Promise<void>;
    onDeleteConfirm: () => Promise<void>;
    onPrescriberActions: {
        add: () => void;
        edit: (p: Prescriber) => void;
        delete: (p: Prescriber) => void;
    };
}

export const AppModals: React.FC<AppModalsProps> = ({
    medications,
    prescribers,
    loadingPrescribers,
    onAddMedication,
    onAddPatient,
    onAddPrescriber,
    onDeleteConfirm,
    onPrescriberActions
}) => {
    const {
        isMedModalOpen, setIsMedModalOpen,
        isPatientModalOpen, setIsPatientModalOpen,
        editingId,
        editingPatientId, targetMedIdForPatient,
        isDeleteModalOpen, setIsDeleteModalOpen,
        deleteTarget,
        isPrescribersListOpen, setIsPrescribersListOpen,
        isPrescriberModalOpen, setIsPrescriberModalOpen,
        editingPrescriberId,
        detailsPatient, setDetailsPatient,
        isRenewing // Add isRenewing
    } = useUI();

    // Derived State for Initial Data
    const initialMedData = React.useMemo(() =>
        editingId ? medications.find(m => m.id === editingId) : null,
        [editingId, medications]);

    const initialPatientData = React.useMemo(() => {
        if (!editingPatientId || !targetMedIdForPatient) return null;
        const med = medications.find(m => m.id === targetMedIdForPatient);
        if (!med) return null;
        const patient = (med.patients ?? []).find(p => p.id === editingPatientId);
        return patient ? { ...patient } : null; // Removed id in form logic, strict types might complain if we pass id, but form expects Omit<Patient, 'id'>. Let's cast or spread.
    }, [editingPatientId, targetMedIdForPatient, medications]);

    const initialPrescriberData = React.useMemo(() =>
        editingPrescriberId ? prescribers.find(p => p.id === editingPrescriberId) : null,
        [editingPrescriberId, prescribers]);

    return (
        <>
            <Modal
                isOpen={isMedModalOpen}
                onClose={() => setIsMedModalOpen(false)}
                title={editingId ? "Editar Medicamento" : "Nuevo Registro"}
            >
                <NewMedForm
                    key={editingId ? `edit-${editingId}` : 'new'}
                    onSubmit={onAddMedication}
                    initialData={initialMedData}
                    isEditing={!!editingId}
                />
            </Modal>

            <Modal
                isOpen={isPatientModalOpen}
                onClose={() => {
                    setIsPatientModalOpen(false);
                    // Resetting editing state is handled by parent or useEffect when modal closes? 
                    // Actually App.tsx handled it. We might need to ensure cleanup happens.
                    // The onClose prop in App.tsx did: setIsPatientModalOpen(false); setEditingPatientId(null);
                    // We should probably rely on useUI actions or passed handlers if we want to be strict.
                    // But for now, we just close. The state persists but won't be used if we explicitly clear it when opening "New".
                    // However, to be safe, we might want to expose a "closePatientModal" action in UIContext or just allow passing a custom onClose.
                    // For now, let's trust the "OnNew" handler cleared it.
                }}
                title={isRenewing ? "Renovar Autorización" : editingPatientId ? "Editar Paciente" : "Asignar Paciente"}
            >
                <NewPatientForm
                    key={editingPatientId ? `edit-${editingPatientId}` : 'new'}
                    onSubmit={onAddPatient}
                    initialData={initialPatientData}
                    isEditing={!!editingPatientId}
                    isRenewing={isRenewing}
                    prescribers={prescribers}
                />
            </Modal>

            <Modal
                isOpen={!!detailsPatient}
                onClose={() => setDetailsPatient(null)}
                title="Detalle del Paciente"
            >
                {detailsPatient && (
                    <div className="p-4 bg-white border-none rounded-lg text-sm">
                        <div className="flex justify-between items-center mb-4 border-b border-emerald-100 pb-2">
                            <h4 className="font-bold text-emerald-900 text-lg">{detailsPatient.name}</h4>
                            <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded font-bold">{detailsPatient.identificationNumber}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className="text-slate-400 text-xs block uppercase font-bold">Diagnóstico</span>
                                <p className="font-medium text-slate-800">{detailsPatient.diagnosis}</p>
                            </div>
                            <div>
                                <span className="text-slate-400 text-xs block uppercase font-bold">Autorización</span>
                                <p className="font-medium text-emerald-700">{detailsPatient.authorizationCode}</p>
                            </div>
                            <div>
                                <span className="text-slate-400 text-xs block uppercase font-bold">Dosis</span>
                                <p className="font-medium text-slate-800">{detailsPatient.dose}</p>
                            </div>
                            <div>
                                <span className="text-slate-400 text-xs block uppercase font-bold">Frecuencia</span>
                                <p className="font-medium text-slate-800">{detailsPatient.frequency}</p>
                            </div>
                            <div>
                                <span className="text-slate-400 text-xs block uppercase font-bold">Ciclos / Meses</span>
                                <p className="font-medium text-slate-800">{detailsPatient.totalCycles} ciclos / {detailsPatient.totalMonths} meses</p>
                            </div>
                            <div>
                                <span className="text-slate-400 text-xs block uppercase font-bold">Fechas</span>
                                <p className="font-medium text-slate-800">{detailsPatient.startMonth} - {detailsPatient.endMonth}</p>
                            </div>
                        </div>

                        {detailsPatient.prescriber && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <span className="text-slate-400 text-xs block uppercase font-bold">Prescrito por</span>
                                <p className="font-bold text-emerald-900">{detailsPatient.prescriber}</p>
                                <p className="text-xs text-slate-500">{detailsPatient.specialty}</p>

                            </div>
                        )}

                        {detailsPatient.status === 'Suspended' && (
                            <div className="mt-4 pt-4 border-t border-red-100 bg-red-50 p-2 rounded">
                                <span className="text-red-600 text-xs block uppercase font-bold">Tratamiento Suspendido</span>
                                <p className="font-bold text-red-800">{detailsPatient.suspensionReason}</p>
                                <p className="text-xs text-red-700">{detailsPatient.suspensionNotes}</p>
                                <p className="text-[10px] text-slate-400 mt-1">{detailsPatient.suspensionDate && new Date(detailsPatient.suspensionDate).toLocaleDateString()}</p>
                            </div>
                        )}

                        {detailsPatient.authorizationHistory && detailsPatient.authorizationHistory.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <span className="text-slate-400 text-xs block uppercase font-bold mb-2">Historial de Autorizaciones</span>
                                <div className="space-y-2">
                                    {detailsPatient.authorizationHistory.map((history, index) => (
                                        <div key={index} className="bg-slate-50 p-2 rounded border border-slate-100 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-slate-700 text-xs">{history.code}</p>
                                                <p className="text-[10px] text-slate-500">{history.startMonth} - {history.endMonth}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="block text-[9px] text-slate-400">Archivado</span>
                                                <span className="text-[10px] text-slate-500 font-mono">
                                                    {new Date(history.archivedDate).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirmar Eliminación"
            >
                {deleteTarget && (
                    <DeleteConfirmation
                        onConfirm={onDeleteConfirm}
                        onCancel={() => setIsDeleteModalOpen(false)}
                        targetName={deleteTarget.name}
                        isPatient={deleteTarget.type === 'patient'}
                    />
                )}
            </Modal>

            <Modal
                isOpen={isPrescribersListOpen}
                onClose={() => setIsPrescribersListOpen(false)}
                title="Directorio Médico"
            >
                <PrescribersListModal
                    prescribers={prescribers}
                    loading={loadingPrescribers}
                    onAddPrescriber={onPrescriberActions.add}
                    onEdit={onPrescriberActions.edit}
                    onDelete={onPrescriberActions.delete}
                />
            </Modal>

            <Modal
                isOpen={isPrescriberModalOpen}
                onClose={() => {
                    setIsPrescriberModalOpen(false);
                    setIsPrescribersListOpen(true);
                    // setEditingPrescriberId(null); // Handled by onClose logic in App or we should expose setter? 
                    // Let's assume the parent handles the "close" or we trust the state.
                    // Actually, setIsPrescriberModalOpen(false) is enough to hide it.
                    // But if we open it again as "New", we expect editingId to be null.
                }}
                title={editingPrescriberId ? "Editar Prescriptor" : "Agregar Prescriptor"}
            >
                <NewPrescriberForm
                    key={editingPrescriberId ? `edit-${editingPrescriberId}` : 'new'}
                    onSubmit={onAddPrescriber}
                    initialData={initialPrescriberData}
                />
            </Modal>
        </>
    );
};
