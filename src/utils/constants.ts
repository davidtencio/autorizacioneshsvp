/**
 * Canonical value of the "Hospital México" application place. The form stores
 * patients' applicationPlace in uppercase (NewPatientForm.tsx upper-cases all
 * inputs), so any comparison must use this constant — NOT the mixed-case
 * "Hosp. México" string used in labels.
 */
export const HOSP_MEXICO = 'HOSP. MÉXICO';

export function isHospitalMexico(applicationPlace: string | undefined | null): boolean {
  if (!applicationPlace) return false;
  return applicationPlace.toUpperCase() === HOSP_MEXICO;
}
