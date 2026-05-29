import { describe, expect, it, vi } from 'vitest';
import type { Patient } from '../types';
import { removePatientById, suspendPatientTreatment, upsertPatient, validatePatientForm } from './patientOperations';

const basePatient = (overrides: Partial<Patient> = {}): Patient => ({
    id: 1,
    identificationNumber: '1-0000-0000',
    name: 'PACIENTE UNO',
    diagnosis: 'DX',
    authorizationCode: 'AUTH-001',
    issuer: 'CCF',
    startMonth: '01/2025',
    endMonth: '03/2025',
    dose: '1',
    frequency: 'Q4W',
    route: 'IV',
    totalCycles: '3',
    totalMonths: '3',
    applicationPlace: 'HOSP. HEREDIA',
    prescriber: 'DR. A',
    specialty: 'ONCOLOGIA',
    ...overrides
});

describe('validatePatientForm', () => {
    const formFrom = (overrides: Partial<Patient> = {}): Omit<Patient, 'id'> => {
        const p = basePatient(overrides);
        delete (p as Partial<Patient>).id;
        return p;
    };

    it('returns no missing fields for a complete form', () => {
        expect(validatePatientForm(formFrom())).toEqual([]);
    });

    it('flags empty and whitespace-only required fields', () => {
        const missing = validatePatientForm(formFrom({ diagnosis: '', name: '   ' }));
        expect(missing).toContain('diagnosis');
        expect(missing).toContain('name');
    });

    it('flags an issuer outside the allowed enum', () => {
        expect(validatePatientForm(formFrom({ issuer: 'XXX' }))).toContain('issuer');
    });

    it('accepts each valid issuer value', () => {
        for (const issuer of ['CCF', 'CLF', 'RA']) {
            expect(validatePatientForm(formFrom({ issuer }))).not.toContain('issuer');
        }
    });
});

describe('patientOperations', () => {
    it('creates a patient when not editing', () => {
        vi.spyOn(Date, 'now').mockReturnValue(999);

        const patient = basePatient({ id: 123 });
        const formData = { ...patient };
        delete (formData as Partial<Patient>).id;
        const result = upsertPatient({
            patients: [],
            patientFormData: formData,
            editingPatientId: null,
            isRenewing: false
        });

        expect(result.action).toBe('created');
        expect(result.patients).toHaveLength(1);
        expect(result.patients[0].id).toBe(999);

        vi.restoreAllMocks();
    });

    it('renews a patient and archives previous authorization', () => {
        const existing = basePatient({
            id: 7,
            authorizationCode: 'OLD-001',
            startMonth: '01/2025',
            endMonth: '02/2025',
            status: 'Suspended'
        });

        const formData: Omit<Patient, 'id'> = {
            ...existing,
            authorizationCode: 'NEW-002',
            startMonth: '03/2025',
            endMonth: '05/2025'
        };

        const result = upsertPatient({
            patients: [existing],
            patientFormData: formData,
            editingPatientId: 7,
            isRenewing: true,
            nowIso: '2026-02-24T12:00:00.000Z'
        });

        expect(result.action).toBe('renewed');
        expect(result.patients[0].authorizationCode).toBe('NEW-002');
        expect(result.patients[0].status).toBe('Active');
        expect(result.patients[0].authorizationHistory).toEqual([
            {
                code: 'OLD-001',
                startMonth: '01/2025',
                endMonth: '02/2025',
                archivedDate: '2026-02-24T12:00:00.000Z'
            }
        ]);
    });

    it('suspends a patient and records metadata', () => {
        const patients = [basePatient(), basePatient({ id: 2, name: 'OTRO' })];

        const result = suspendPatientTreatment(
            patients,
            1,
            'Efecto Adverso',
            'Reacción importante',
            '2026-02-24T13:00:00.000Z'
        );

        expect(result[0].status).toBe('Suspended');
        expect(result[0].suspensionReason).toBe('Efecto Adverso');
        expect(result[0].suspensionNotes).toBe('Reacción importante');
        expect(result[0].suspensionDate).toBe('2026-02-24T13:00:00.000Z');
        expect(result[1].status).toBeUndefined();
    });

    it('removes a patient by id', () => {
        const result = removePatientById([basePatient({ id: 1 }), basePatient({ id: 2 })], 1);
        expect(result.map(p => p.id)).toEqual([2]);
    });
});
