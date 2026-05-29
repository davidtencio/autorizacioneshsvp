import { useDeferredValue, useMemo } from 'react';
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
import { usePatientsByMedication } from './hooks/usePatientsByMedication';
import { usePatientMutations } from './hooks/usePatientMutations';
import { useDeleteConfirmation } from './hooks/useDeleteConfirmation';
import { useUI } from './context/UIContext';
import { useAuth } from './hooks/useAuth';
import { useDebouncedValue } from './hooks/useDebouncedValue';

export const FirestoreWorkspace = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const {
    medications,
    loading: loadingMeds,
    error: errorMeds,
    addMedication,
    updateMedication,
    deleteMedication,
    loadMore,
    limitCount,
    hasMore,
  } = useMedications({ enabled: true });
  const {
    prescribers,
    loading: loadingPrescribers,
    error: errorPrescribers,
    addPrescriber,
    updatePrescriber,
    deletePrescriber,
  } = usePrescribers({ enabled: true });
  const {
    toasts,
    addToast,
    searchQuery,
    setSearchQuery,
    setIsMedModalOpen,
    setIsPatientModalOpen,
    setIsDeleteModalOpen,
    setIsPrescribersListOpen,
    setIsPrescriberModalOpen,
    setDetailsPatient,
    editingId,
    setEditingId,
    editingPatientId,
    setEditingPatientId,
    editingPrescriberId,
    setEditingPrescriberId,
    targetMedIdForPatient,
    setTargetMedIdForPatient,
    deleteTarget,
    setDeleteTarget,
    openFDAModal,
    isRenewing,
    setIsRenewing,
  } = useUI();

  const { setPatientsForMedication, medicationsWithPatients } = usePatientsByMedication(medications);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 200);
  const deferredSearchQuery = useDeferredValue(debouncedSearchQuery);
  const filteredMedications = useMemo(() => {
    const query = deferredSearchQuery.toLowerCase();
    return medicationsWithPatients
      .filter(
        (med) =>
          med.name.toLowerCase().includes(query) ||
          med.code.toLowerCase().includes(query) ||
          (med.patients ?? []).some(
            (p) => p.name.toLowerCase().includes(query) || p.identificationNumber.includes(query)
          )
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  }, [medicationsWithPatients, deferredSearchQuery]);

  const { handleEditMed, handleDeleteMedClick, handleAddMedication } = useMedicationActions({
    editingId,
    setEditingId,
    setIsMedModalOpen,
    setDeleteTarget,
    setIsDeleteModalOpen,
    addMedication,
    updateMedication,
    addToast,
  });
  const { handleAddPrescriber, prescriberActions } = usePrescriberActions({
    editingPrescriberId,
    setEditingPrescriberId,
    setIsPrescriberModalOpen,
    setIsPrescribersListOpen,
    setIsDeleteModalOpen,
    setDeleteTarget,
    addPrescriber,
    updatePrescriber,
    addToast,
  });
  const { addOrUpdatePatient, suspendPatient, deletePatient } = usePatientMutations({
    medications: medicationsWithPatients,
    setPatientsForMedication,
    addToast,
    editingPatientId,
    isRenewing,
    onAddSuccess: () => {
      setIsPatientModalOpen(false);
      setEditingPatientId(null);
      setTargetMedIdForPatient(null);
      setIsRenewing(false);
    },
  });
  const handleConfirmDelete = useDeleteConfirmation({
    deleteTarget,
    setIsDeleteModalOpen,
    setDeleteTarget,
    deleteMedication,
    deletePatient,
    deletePrescriber,
    addToast,
  });

  const handleDeletePatientClick = (patient: Patient, medId: number | string) => {
    setDeleteTarget({ type: 'patient', id: patient.id, name: patient.name, parentId: medId });
    setIsDeleteModalOpen(true);
  };
  const handleEditPatient = (patient: Patient, medId: number | string) => {
    setTargetMedIdForPatient(medId);
    setEditingPatientId(patient.id);
    setIsPatientModalOpen(true);
  };
  const handleNewPatient = (medId: number | string) => {
    setTargetMedIdForPatient(medId);
    setEditingPatientId(null);
    setIsPatientModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto shadow-2xl overflow-hidden border-x border-slate-200 relative">
      <ToastContainer toasts={toasts} />
      <Routes>
        <Route
          path="/"
          element={
            <DashboardView
              medications={filteredMedications}
              loading={loadingMeds}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              onMedClick={(med) => navigate(`/medication/${med.id}`)}
              onNewMed={() => {
                setEditingId(null);
                setIsMedModalOpen(true);
              }}
              onAddPrescriber={() => setIsPrescribersListOpen(true)}
              onLoadMore={loadMore}
              limitCount={limitCount}
              hasMore={hasMore}
              onLogout={logout}
              onViewFDA={openFDAModal}
              error={errorMeds}
            />
          }
        />
        {/* KPIs must reflect the full dataset, not the search-filtered subset. */}
        <Route path="/kpi" element={<KPIView medications={medicationsWithPatients} />} />
        <Route
          path="/medication/:id"
          element={
            <DetailsRouteWrapper
              medications={medicationsWithPatients}
              onGoHome={() => navigate('/')}
              onDeletePatient={handleDeletePatientClick}
              onNewPatient={handleNewPatient}
              onEditMed={handleEditMed}
              onDeleteMed={handleDeleteMedClick}
              onEditPatient={handleEditPatient}
              onSuspendPatient={suspendPatient}
              onViewDetails={setDetailsPatient}
            />
          }
        />
      </Routes>
      <AppModals
        medications={medicationsWithPatients}
        prescribers={prescribers}
        loadingPrescribers={loadingPrescribers}
        onAddMedication={handleAddMedication}
        onAddPatient={(data) => addOrUpdatePatient(data, targetMedIdForPatient)}
        onAddPrescriber={handleAddPrescriber}
        onDeleteConfirm={handleConfirmDelete}
        onPrescriberActions={prescriberActions}
      />
      {errorPrescribers && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-xs font-semibold shadow">
          {errorPrescribers}
        </div>
      )}
      <FDAModal />
    </div>
  );
};
