export interface TransferControl {
  sentDate?: string;
  receivedDate?: string;
  notes?: string;
  totalUnits?: string;
  transfers?: string[];
  pendingBalance?: string;
}

export interface AuthorizationHistoryItem {
  code: string;
  startMonth: string;
  endMonth: string;
  archivedDate: string;
}

export interface Patient {
  id: number;
  // Identificación
  identificationNumber: string;
  name: string;

  // Clínico
  diagnosis: string;

  // Autorización
  authorizationCode: string; // Puede ser alfanumérico
  issuer: string; // CCF, CLF, RA

  // Tratamiento
  startMonth: string;
  endMonth: string;
  dose: string; // Dosis
  frequency: string; // Frecuencia
  route: string; // Via de Administración
  totalCycles: string; // Total de Ciclos
  totalMonths: string; // Total de Meses

  // Logística
  applicationPlace: string; // Hosp. Heredia, México, Otro
  prescriber: string; // Nombre del prescriptor
  specialty: string; // Especialidad del prescriptor

  // Control de Traslado (Solo si Hosp. México)
  transferControl?: TransferControl;

  // Estado del Tratamiento
  status?: 'Active' | 'Suspended';
  suspensionReason?: string;
  suspensionNotes?: string;
  suspensionDate?: string;

  // Historial de Autorizaciones
  authorizationHistory?: AuthorizationHistoryItem[];
}

export interface PatientsSummary {
  count: number;
  lastUpdated: string;
}

export interface Medication {
  id: string; // Firestore ID
  code: string;
  name: string;
  strength: string; // Potencia (e.g., 500mg)
  route: string; // Vía de administración
  type: string; // Tipo (General, etc.)
  category?: 'Almacenable' | 'Compra Local' | 'No Definido'; // New Category
  // Phase 2.d: patients[] no longer lives in the medication doc. It is
  // hydrated client-side from the subcollection medications/{id}/patients.
  // Kept optional in the type so consumers that rely on this shape (e.g.
  // medicationsWithPatients in FirestoreWorkspace) keep type-checking,
  // but newly read docs from Firestore won't have this field.
  patients?: Patient[];
  // Source of truth for the patient count in listings.
  patientsSummary?: PatientsSummary;
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface Prescriber {
  id: string; // Firestore ID
  name: string;
  specialty: string;
}

export interface FDAData {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
    product_type?: string[];
  };
  boxed_warning?: string[];
  indications_and_usage?: string[];
  dosage_and_administration?: string[];
  contraindications?: string[];
  warnings?: string[];
  adverse_reactions?: string[];
  drug_interactions?: string[];
  use_in_specific_populations?: string[];
  overdosage?: string[];
  storage_and_handling?: string[];
}
