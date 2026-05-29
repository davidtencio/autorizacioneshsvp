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
import { writeBatch, doc } from 'firebase/firestore';
import { buildPatientsSummary, fetchPatientsByMedication } from './services/patientStore';
import { logger } from './utils/logger';

export const FirestoreWorkspace = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { medications, loading: loadingMeds, error: errorMeds, addMedication, updateMedication, deleteMedication, loadMore, limitCount, hasMore } = useMedications({ enabled: true });
  const [patientsByMedication, setPatientsByMedication] = React.useState<Record<string, Patient[]>>({});
  const fetchedIdsRef = React.useRef<Set<string>>(new Set());
  const { prescribers, loading: loadingPrescribers, error: errorPrescribers, addPrescriber, updatePrescriber, deletePrescriber } = usePrescribers({ enabled: true });
  const { toasts, addToast, searchQuery, setSearchQuery, setIsMedModalOpen, setIsPatientModalOpen, setIsDeleteModalOpen, setIsPrescribersListOpen, setIsPrescriberModalOpen, setDetailsPatient, editingId, setEditingId, editingPatientId, setEditingPatientId, editingPrescriberId, setEditingPrescriberId, targetMedIdForPatient, setTargetMedIdForPatient, deleteTarget, setDeleteTarget, openFDAModal, isRenewing, setIsRenewing } = useUI();

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 200);
  const deferredSearchQuery = useDeferredValue(debouncedSearchQuery);
  const medicationsWithPatients = useMemo(
    () => medications.map((med) => ({ ...med, patients: patientsByMedication[String(med.id)] ?? [] })),
    [medications, patientsByMedication]
  );

  const filteredMedications = useMemo(() => {
    const query = deferredSearchQuery.toLowerCase();
    return medicationsWithPatients.filter((med) => med.name.toLowerCase().includes(query) || med.code.toLowerCase().includes(query) || med.patients.some((p) => p.name.toLowerCase().includes(query) || p.identificationNumber.includes(query))).sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }, [medicationsWithPatients, deferredSearchQuery]);

  React.useEffect(() => {
    const newMedIds = medications
      .map((m) => String(m.id))
      .filter((id) => !fetchedIdsRef.current.has(id));
    if (newMedIds.length === 0) return;
    newMedIds.forEach(async (medId) => {
      fetchedIdsRef.current.add(medId);
      try {
        const subcollectionPatients = await fetchPatientsByMedication(db, medId);
        setPatientsByMedication((prev) => ({ ...prev, [medId]: subcollectionPatients }));
      } catch (err) {
        logger.error('Error fetching patients subcollection', { medId, error: String(err) });
      }
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
          const medKey = String(med.id);
          const previousPatients = med.patients;
          const updatedPatients = removePatientById(previousPatients, Number(deleteTarget.id));

          // Optimistic update with rollback on failure.
          setPatientsByMedication((prev) => ({ ...prev, [medKey]: updatedPatients }));
          try {
            const batch = writeBatch(db);
            const patientRef = doc(db, 'medications', medKey, 'patients', String(deleteTarget.id));
            batch.delete(patientRef);

            const medRef = doc(db, 'medications', medKey);
            batch.update(medRef, {
              patientsSummary: buildPatientsSummary(updatedPatients),
            });

            await batch.commit();
            addToast('Paciente eliminado', 'success');
          } catch (err) {
            setPatientsByMedication((prev) => ({ ...prev, [medKey]: previousPatients }));
            throw err;
          }
        }
      } else if (deleteTarget.type === 'prescriber') {
        await deletePrescriber(deleteTarget.id);
        addToast('Prescriptor eliminado', 'success');
      }
    } catch (err) {
      console.error('Error deleting:', err);
      addToast('Error al eliminar', 'error');
    }
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };

  const handleAddPatient = async (patientFormData: Omit<Patient, 'id'>) => {
    if (!patientFormData.name || !targetMedIdForPatient) return;
    const med = medicationsWithPatients.find((m) => m.id === targetMedIdForPatient);
    if (!med) return addToast('Error: Medicamento no encontrado', 'error');
    const medKey = String(med.id);
    const previousPatients = med.patients;
    try {
      const { patients: updatedPatients, action } = upsertPatient({ patients: previousPatients, patientFormData, editingPatientId, isRenewing });
      const targetPatient = updatedPatients.find((p) => p.id === Number(editingPatientId ?? updatedPatients[updatedPatients.length - 1]?.id));

      // Optimistic update with rollback on failure.
      setPatientsByMedication((prev) => ({ ...prev, [medKey]: updatedPatients }));
      try {
        if (targetPatient) {
          const batch = writeBatch(db);
          const patientRef = doc(db, 'medications', medKey, 'patients', String(targetPatient.id));
          batch.set(patientRef, targetPatient, { merge: true });

          const medRef = doc(db, 'medications', medKey);
          batch.update(medRef, {
            patientsSummary: buildPatientsSummary(updatedPatients),
          });

          await batch.commit();
        }
      } catch (err) {
        setPatientsByMedication((prev) => ({ ...prev, [medKey]: previousPatients }));
        throw err;
      }

      addToast(action === 'renewed' ? 'Autorizacion renovada' : action === 'updated' ? 'Paciente actualizado' : 'Paciente agregado exitosamente', 'success');
      setIsPatientModalOpen(false); setEditingPatientId(null); setTargetMedIdForPatient(null); setIsRenewing(false);
    } catch (err) {
      logger.error('Error adding patient', { medId: medKey, error: String(err) });
      addToast('Error al guardar paciente', 'error');
    }
  };

  const handleSuspendPatient = async (patient: Patient, medId: number | string, reason: string, notes?: string) => {
    const med = medicationsWithPatients.find((m) => m.id === medId);
    if (!med) return;
    const medKey = String(med.id);
    const previousPatients = med.patients;
    try {
      const updated = suspendPatientTreatment(previousPatients, patient.id, reason, notes);
      const suspended = updated.find((p) => p.id === patient.id);

      // Optimistic update with rollback on failure.
      setPatientsByMedication((prev) => ({ ...prev, [medKey]: updated }));
      try {
        if (suspended) {
          const batch = writeBatch(db);
          const patientRef = doc(db, 'medications', medKey, 'patients', String(suspended.id));
          batch.set(patientRef, suspended, { merge: true });

          const medRef = doc(db, 'medications', medKey);
          batch.update(medRef, {
            patientsSummary: buildPatientsSummary(updated),
          });

          await batch.commit();
        }
      } catch (err) {
        setPatientsByMedication((prev) => ({ ...prev, [medKey]: previousPatients }));
        throw err;
      }
      addToast(`Tratamiento suspendido (${reason})`, 'success');
    } catch (err) {
      logger.error('Error suspending patient', { medId: medKey, error: String(err) });
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
