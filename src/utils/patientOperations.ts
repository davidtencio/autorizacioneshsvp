import type { Patient } from '../types';

/**
 * Fields that the Firestore security rules (`isPatientDocument`) require to be
 * non-empty strings. The client form must enforce the same set so writes never
 * fail silently at the rules layer with an opaque "Error al guardar" toast.
 *
 * Labels are user-facing (Spanish) and shown in the validation summary.
 */
export const REQUIRED_PATIENT_FIELDS: ReadonlyArray<
    { field: keyof Omit<Patient, 'id'>; label: string }
> = [
    { field: 'identificationNumber', label: 'Cédula / Identificación' },
    { field: 'name', label: 'Nombre Completo' },
    { field: 'diagnosis', label: 'Diagnóstico' },
    { field: 'authorizationCode', label: 'Clave Autorización' },
    { field: 'issuer', label: 'Emisor' },
    { field: 'startMonth', label: 'Mes Inicio' },
    { field: 'endMonth', label: 'Mes Finalización' },
    { field: 'dose', label: 'Dosis' },
    { field: 'frequency', label: 'Frecuencia' },
    { field: 'route', label: 'Vía de Administración' },
    { field: 'totalCycles', label: 'Total Ciclos' },
    { field: 'totalMonths', label: 'Total Meses' },
    { field: 'applicationPlace', label: 'Lugar de Aplicación' },
    { field: 'prescriber', label: 'Prescriptor' },
    { field: 'specialty', label: 'Especialidad' },
];

const VALID_ISSUERS: ReadonlySet<string> = new Set(['CCF', 'CLF', 'RA']);

/**
 * Returns the list of required patient fields that are missing or invalid,
 * mirroring the Firestore rules. An empty array means the form is valid.
 */
export const validatePatientForm = (
    data: Omit<Patient, 'id'>
): Array<keyof Omit<Patient, 'id'>> => {
    const missing: Array<keyof Omit<Patient, 'id'>> = [];
    for (const { field } of REQUIRED_PATIENT_FIELDS) {
        const value = data[field];
        if (typeof value !== 'string' || value.trim().length === 0) {
            missing.push(field);
        }
    }
    if (!missing.includes('issuer') && !VALID_ISSUERS.has(data.issuer)) {
        missing.push('issuer');
    }
    return missing;
};

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
        // Time-based id, made collision-safe against the existing patients in
        // this medication (two patients added within the same millisecond, or a
        // clock that didn't advance, would otherwise reuse an id and overwrite
        // the previous doc).
        const existingIds = new Set(currentPatients.map((p) => p.id));
        let newId = Date.now();
        while (existingIds.has(newId)) {
            newId += 1;
        }

        const newPatient: Patient = {
            id: newId,
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
