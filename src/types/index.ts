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

export interface Medication {
  id: string; // Firestore ID
  code: string;
  name: string;
  strength: string; // Potencia (e.g., 500mg)
  route: string; // Vía de administración
  type: string; // Tipo (General, etc.)
  category?: 'Almacenable' | 'Compra Local' | 'No Definido'; // New Category
  patients: Patient[];
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
