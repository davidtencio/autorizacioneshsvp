
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Toast, Patient, FDAData } from '../types';

interface DeleteTarget {
    type: 'medication' | 'patient' | 'prescriber';
    id: number | string;
    name: string;
    parentId?: number | string;
}

interface UIContextType {
    // Toasts
    toasts: Toast[];
    addToast: (message: string, type: 'success' | 'error') => void;

    // Search
    searchQuery: string;
    setSearchQuery: (query: string) => void;

    // Modals
    isMedModalOpen: boolean;
    setIsMedModalOpen: (isOpen: boolean) => void;
    isPatientModalOpen: boolean;
    setIsPatientModalOpen: (isOpen: boolean) => void;
    isDeleteModalOpen: boolean;
    setIsDeleteModalOpen: (isOpen: boolean) => void;
    isPrescribersListOpen: boolean;
    setIsPrescribersListOpen: (isOpen: boolean) => void;
    isPrescriberModalOpen: boolean;
    setIsPrescriberModalOpen: (isOpen: boolean) => void;

    // Details Modal
    detailsPatient: Patient | null;
    setDetailsPatient: (patient: Patient | null) => void;

    // Editing / Deletion State
    editingId: number | string | null;
    setEditingId: (id: number | string | null) => void;

    editingPatientId: number | string | null;
    setEditingPatientId: (id: number | string | null) => void;

    editingPrescriberId: number | string | null;
    setEditingPrescriberId: (id: number | string | null) => void;

    targetMedIdForPatient: number | string | null;
    setTargetMedIdForPatient: (id: number | string | null) => void;

    deleteTarget: DeleteTarget | null;
    setDeleteTarget: (target: DeleteTarget | null) => void;

    // Renewal State
    isRenewing: boolean;
    setIsRenewing: (isRenewing: boolean) => void;

    // FDA
    isFDAModalOpen: boolean;
    setIsFDAModalOpen: (isOpen: boolean) => void;
    fdaData: FDAData | null;
    setFdaData: (data: FDAData | null) => void;
    fdaLoading: boolean;
    setFdaLoading: (loading: boolean) => void;
    fdaError: string | null;
    setFdaError: (error: string | null) => void;
    openFDAModal: (drugName: string) => void;
    closeFDAModal: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: ReactNode }) => {
    // Toasts
    const [toasts, setToasts] = useState<Toast[]>([]);
    const addToast = (message: string, type: 'success' | 'error') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    // Search
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [isMedModalOpen, setIsMedModalOpen] = useState(false);
    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isPrescribersListOpen, setIsPrescribersListOpen] = useState(false);
    const [isPrescriberModalOpen, setIsPrescriberModalOpen] = useState(false);

    // Details
    const [detailsPatient, setDetailsPatient] = useState<Patient | null>(null);

    // Tracking State
    const [editingId, setEditingId] = useState<number | string | null>(null);
    const [editingPatientId, setEditingPatientId] = useState<number | string | null>(null);
    const [editingPrescriberId, setEditingPrescriberId] = useState<number | string | null>(null);
    const [targetMedIdForPatient, setTargetMedIdForPatient] = useState<number | string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

    // Renewal State
    const [isRenewing, setIsRenewing] = useState(false);

    // FDA State
    const [isFDAModalOpen, setIsFDAModalOpen] = useState(false);

    const [fdaData, setFdaData] = useState<FDAData | null>(null);
    const [fdaLoading, setFdaLoading] = useState(false);
    const [fdaError, setFdaError] = useState<string | null>(null);

    const openFDAModal = async (drugName: string) => {
        setIsFDAModalOpen(true);
        setFdaLoading(true);
        setFdaError(null);
        setFdaData(null);
        try {
            // Lazy load service to avoid circular deps if any
            const { fetchDrugLabel } = await import('../services/fdaService');
            const data = await fetchDrugLabel(drugName);
            if (data) {
                setFdaData(data);
            } else {
                setFdaError("No se encontró información oficial para este medicamento.");
            }
        } catch {
            setFdaError("Error al conectar con el servicio de la FDA.");
        } finally {
            setFdaLoading(false);
        }
    };

    const closeFDAModal = () => {
        setIsFDAModalOpen(false);
        setFdaData(null);
        setFdaError(null);
    };

    return (
        <UIContext.Provider value={{
            toasts, addToast,
            searchQuery, setSearchQuery,
            isMedModalOpen, setIsMedModalOpen,
            isPatientModalOpen, setIsPatientModalOpen,
            isDeleteModalOpen, setIsDeleteModalOpen,
            isPrescribersListOpen, setIsPrescribersListOpen,
            isPrescriberModalOpen, setIsPrescriberModalOpen,
            detailsPatient, setDetailsPatient,
            editingId, setEditingId,
            editingPatientId, setEditingPatientId,
            editingPrescriberId, setEditingPrescriberId,
            targetMedIdForPatient, setTargetMedIdForPatient,
            deleteTarget, setDeleteTarget,
            isRenewing, setIsRenewing,
            // FDA
            isFDAModalOpen, setIsFDAModalOpen,
            fdaData, setFdaData,
            fdaLoading, setFdaLoading,
            fdaError, setFdaError,
            openFDAModal, closeFDAModal
        }}>
            {children}
        </UIContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useUI = () => {
    const context = useContext(UIContext);
    if (context === undefined) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
