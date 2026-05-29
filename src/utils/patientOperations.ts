import type { Patient } from '../types';

interface UpsertPatientParams {
    patients: Patient[];
    patientFormData: Omit<Patient, 'id'>;
    editingPatientId: number | string | null;
    isRenewing: boolean;
    nowIso?: string;
}

interface UpsertPatientResult {
    patients: Patient[];
    action: 'created' | 'updated' | 'renewed';
}

export const upsertPatient = ({
    patients,
    patientFormData,
    editingPatientId,
    isRenewing,
    nowIso = new Date().toISOString()
}: UpsertPatientParams): UpsertPatientResult => {
    const currentPatients = [...patients];

    if (!editingPatientId) {
        const newPatient: Patient = {
            id: Date.now(),
            ...patientFormData
        };

        return {
            patients: [...currentPatients, newPatient],
            action: 'created'
        };
    }

    const updatedPatients = currentPatients.map((patient) => {
        if (patient.id !== editingPatientId) return patient;

        if (!isRenewing) {
            return { ...patient, ...patientFormData };
        }

        const historyItem = {
            code: patient.authorizationCode,
            startMonth: patient.startMonth,
            endMonth: patient.endMonth,
            archivedDate: nowIso
        };

        const authorizationHistory = patient.authorizationHistory
            ? [...patient.authorizationHistory, historyItem]
            : [historyItem];

        return {
            ...patient,
            ...patientFormData,
            authorizationHistory,
            status: 'Active' as const
        };
    });

    return {
        patients: updatedPatients,
        action: isRenewing ? 'renewed' : 'updated'
    };
};

export const suspendPatientTreatment = (
    patients: Patient[],
    patientId: number,
    reason: string,
    notes?: string,
    nowIso = new Date().toISOString()
): Patient[] => {
    return patients.map((patient) =>
        patient.id === patientId
            ? {
                ...patient,
                status: 'Suspended' as const,
                suspensionReason: reason,
                ...(notes !== undefined ? { suspensionNotes: notes } : {}),
                suspensionDate: nowIso
            }
            : patient
    );
};

export const removePatientById = (patients: Patient[], patientId: number): Patient[] => {
    return patients.filter((patient) => patient.id !== patientId);
};
