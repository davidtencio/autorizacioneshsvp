import React, { useDeferredValue, useMemo } from 'react';
import { Route, Routes, useNavigate } from 'react-router-dom';
import type { Patient } from './types';
import { ToastContainer } from './components/ui/ToastContainer';
import { DetailsRouteWrapper } from './components/DetailsRouteWrapper';
import { AppModals } from './components/AppModals';
import { FDAModal } from './components/FDAModal';
import { DashboardView } from './views/DashboardView';
import { KPIView } from './views/KPIView';
import { useMedications } from './hooks/useMedications';
import { usePrescribers } from './hooks/usePrescribers';
import { useMedicationActions } from './hooks/useMedicationActions';
import { usePrescriberActions } from './hooks/usePrescriberActions';
import { useUI } from './context/UIContext';
import { useAuth } from './hooks/useAuth';
import { removePatientById, suspendPatientTreatment, upsertPatient } from './utils/patientOperations';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { db } from './firebase/firestore';
import { backfillMedicationPatients, deletePatientFromSubcollection, fetchPatientsByMedication, upsertPatientInSubcollection } from './services/patientStore';

export const FirestoreWorkspace = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { medications, loading: loadingMeds, error: errorMeds, addMedication, updateMedication, deleteMedication, loadMore, limitCount, hasMore } = useMedications({ enabled: true });
  const [patientsByMedication, setPatientsByMedication] = React.useState<Record<string, Patient[]>>({});
  const { prescribers, loading: loadingPrescribers, error: errorPrescribers, addPrescriber, updatePrescriber, deletePrescriber } = usePrescribers({ enabled: true });
  const { toasts, addToast, searchQuery, setSearchQuery, setIsMedModalOpen, setIsPatientModalOpen, setIsDeleteModalOpen, setIsPrescribersListOpen, setIsPrescriberModalOpen, setDetailsPatient, editingId, setEditingId, editingPatientId, setEditingPatientId, editingPrescriberId, setEditingPrescriberId, targetMedIdForPatient, setTargetMedIdForPatient, deleteTarget, setDeleteTarget, openFDAModal, isRenewing, setIsRenewing } = useUI();

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 200);
  const deferredSearchQuery = useDeferredValue(debouncedSearchQuery);
  const medicationsWithPatients = useMemo(
    () => medications.map((med) => ({ ...med, patients: patientsByMedication[String(med.id)] ?? med.patients })),
    [medications, patientsByMedication]
  );

  const filteredMedications = useMemo(() => {
    const query = deferredSearchQuery.toLowerCase();
    return medicationsWithPatients.filter((med) => med.name.toLowerCase().includes(query) || med.code.toLowerCase().includes(query) || med.patients.some((p) => p.name.toLowerCase().includes(query) || p.identificationNumber.includes(query))).sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }, [medicationsWithPatients, deferredSearchQuery]);

  React.useEffect(() => {
    medications.forEach(async (med) => {
      await backfillMedicationPatients(db, med).catch(() => undefined);
      const medId = String(med.id);
      const subcollectionPatients = await fetchPatientsByMedication(db, medId).catch(() => []);
      setPatientsByMedication((prev) => ({
        ...prev,
        [medId]: subcollectionPatients.length > 0 ? subcollectionPatients : med.patients,
      }));
    });
  }, [medications]);

  const { handleEditMed, handleDeleteMedClick, handleAddMedication } = useMedicationActions({ editingId, setEditingId, setIsMedModalOpen, setDeleteTarget, setIsDeleteModalOpen, addMedication, updateMedication, addToast });
  const { handleAddPrescriber, prescriberActions } = usePrescriberActions({ editingPrescriberId, setEditingPrescriberId, setIsPrescriberModalOpen, setIsPrescribersListOpen, setIsDeleteModalOpen, setDeleteTarget, addPrescriber, updatePrescriber, addToast });

  const handleDeletePatientClick = (patient: Patient, medId: number | string) => { setDeleteTarget({ type: 'patient', id: patient.id, name: patient.name, parentId: medId }); setIsDeleteModalOpen(true); };
  const handleEditPatient = (patient: Patient, medId: number | string) => { setTargetMedIdForPatient(medId); setEditingPatientId(patient.id); setIsPatientModalOpen(true); };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'medication') {
        await deleteMedication(deleteTarget.id);
        navigate('/');
        addToast('Medicamento eliminado', 'success');
      } else if (deleteTarget.type === 'patient' && deleteTarget.parentId) {
        const med = medicationsWithPatients.find((m) => m.id === deleteTarget.parentId);
        if (med) {
          await deletePatientFromSubcollection(db, String(med.id), Number(deleteTarget.id));
          const updatedPatients = removePatientById(med.patients, Number(deleteTarget.id));
          await updateMedication(med.id, { patients: updatedPatients });
          setPatientsByMedication((prev) => ({ ...prev, [String(med.id)]: updatedPatients }));
          addToast('Paciente eliminado', 'success');
        }
      } else if (deleteTarget.type === 'prescriber') {
        await deletePrescriber(deleteTarget.id);
        addToast('Prescriptor eliminado', 'success');
      }
    } catch {
      addToast('Error al eliminar', 'error');
    }
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const handleAddPatient = async (patientFormData: Omit<Patient, 'id'>) => {
    if (!patientFormData.name || !targetMedIdForPatient) return;
    const med = medicationsWithPatients.find((m) => m.id === targetMedIdForPatient);
    if (!med) return addToast('Error: Medicamento no encontrado', 'error');
    try {
      const { patients: updatedPatients, action } = upsertPatient({ patients: med.patients, patientFormData, editingPatientId, isRenewing });
      const targetPatient = updatedPatients.find((p) => p.id === Number(editingPatientId ?? updatedPatients[updatedPatients.length - 1]?.id));
      if (targetPatient) {
        await upsertPatientInSubcollection(db, String(med.id), targetPatient);
      }
      addToast(action === 'renewed' ? 'Autorizacion renovada' : action === 'updated' ? 'Paciente actualizado' : 'Paciente agregado exitosamente', 'success');
      await updateMedication(med.id, { patients: updatedPatients });
      setPatientsByMedication((prev) => ({ ...prev, [String(med.id)]: updatedPatients }));
      setIsPatientModalOpen(false); setEditingPatientId(null); setTargetMedIdForPatient(null); setIsRenewing(false);
    } catch {
      addToast('Error al guardar paciente', 'error');
    }
  };

  const handleSuspendPatient = async (patient: Patient, medId: number | string, reason: string, notes?: string) => {
    const med = medicationsWithPatients.find((m) => m.id === medId);
    if (!med) return;
    try {
      const updated = suspendPatientTreatment(med.patients, patient.id, reason, notes);
      const suspended = updated.find((p) => p.id === patient.id);
      if (suspended) {
        await upsertPatientInSubcollection(db, String(med.id), suspended);
      }
      await updateMedication(med.id, { patients: updated });
      setPatientsByMedication((prev) => ({ ...prev, [String(med.id)]: updated }));
      addToast(`Tratamiento suspendido (${reason})`, 'success');
    } catch {
      addToast('Error al suspender tratamiento', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto shadow-2xl overflow-hidden border-x border-slate-200 relative">
      <ToastContainer toasts={toasts} />
      <Routes>
        <Route path="/" element={<DashboardView medications={filteredMedications} loading={loadingMeds} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onMedClick={(med) => navigate(`/medication/${med.id}`)} onNewMed={() => { setEditingId(null); setIsMedModalOpen(true); }} onAddPrescriber={() => setIsPrescribersListOpen(true)} onLoadMore={loadMore} limitCount={limitCount} hasMore={hasMore} onLogout={logout} onViewFDA={openFDAModal} error={errorMeds} />} />
        <Route path="/kpi" element={<KPIView medications={filteredMedications} />} />
        <Route path="/medication/:id" element={<DetailsRouteWrapper medications={medicationsWithPatients} onGoHome={() => navigate('/')} onDeletePatient={handleDeletePatientClick} onNewPatient={(medId) => { setTargetMedIdForPatient(medId); setEditingPatientId(null); setIsPatientModalOpen(true); }} onEditMed={handleEditMed} onDeleteMed={handleDeleteMedClick} onEditPatient={handleEditPatient} onSuspendPatient={handleSuspendPatient} onViewDetails={setDetailsPatient} />} />
      </Routes>
      <AppModals medications={medicationsWithPatients} prescribers={prescribers} loadingPrescribers={loadingPrescribers} onAddMedication={handleAddMedication} onAddPatient={handleAddPatient} onAddPrescriber={handleAddPrescriber} onDeleteConfirm={handleConfirmDelete} onPrescriberActions={prescriberActions} />
      {errorPrescribers && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-xs font-semibold shadow">{errorPrescribers}</div>}
      <FDAModal />
    </div>
  );
};
