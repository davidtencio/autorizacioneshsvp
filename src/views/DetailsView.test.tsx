import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Medication, Patient } from '../types';
import { DetailsView } from './DetailsView';

const setIsRenewingMock = vi.fn();
const canEditMock = vi.fn(() => true);

vi.mock('../hooks/useAuth', () => ({
    useAuth: () => ({
        user: { email: 'editor@hsvp.com', isAnonymous: false }
    })
}));

vi.mock('../context/UIContext', () => ({
    useUI: () => ({
        setIsRenewing: setIsRenewingMock
    })
}));

vi.mock('../utils/permissions', () => ({
    canEdit: () => canEditMock()
}));

const basePatient = (overrides: Partial<Patient> = {}): Patient => ({
    id: 1,
    identificationNumber: '1-0000-0000',
    name: 'PACIENTE PRUEBA',
    diagnosis: 'DX',
    authorizationCode: 'AUTH-1',
    issuer: 'CCF',
    startMonth: '01/2025',
    endMonth: '12/2026',
    dose: '1',
    frequency: 'Q4W',
    route: 'IV',
    totalCycles: '4',
    totalMonths: '4',
    applicationPlace: 'HOSP. HEREDIA',
    prescriber: 'DR. TEST',
    specialty: 'ONCOLOGIA',
    ...overrides
});

const renderView = (patient: Patient, overrides?: Partial<Medication>) => {
    const medication: Medication = {
        id: 'med-1',
        code: '1-11-11-1111',
        name: 'MED TEST',
        strength: '10 MG',
        route: 'IV',
        type: 'General',
        patients: [patient],
        ...overrides
    };

    const handlers = {
        onGoHome: vi.fn(),
        onDeletePatient: vi.fn(),
        onNewPatient: vi.fn(),
        onEditMed: vi.fn(),
        onDeleteMed: vi.fn(),
        onEditPatient: vi.fn(),
        onSuspendPatient: vi.fn(),
        onViewDetails: vi.fn()
    };

    render(<DetailsView selectedMed={medication} {...handlers} />);

    return handlers;
};

describe('DetailsView critical flows', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        canEditMock.mockReturnValue(true);
    });

    it('triggers renewal flow for expired patients', async () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2026, 1, 24)); // Feb 24, 2026
        const patient = basePatient({
            id: 10,
            endMonth: '01/2026'
        });
        const handlers = renderView(patient);

        fireEvent.click(screen.getByRole('button', { name: /renovar/i }));

        expect(setIsRenewingMock).toHaveBeenCalledWith(true);
        expect(handlers.onEditPatient).toHaveBeenCalledWith(expect.objectContaining({ id: 10 }));

        vi.useRealTimers();
    });

    it('opens suspend modal and confirms suspension', async () => {
        const patient = basePatient({ id: 20, endMonth: '12/2026' });
        const handlers = renderView(patient);

        fireEvent.click(screen.getByTitle(/suspender tratamiento/i));
        fireEvent.click(screen.getByLabelText(/efecto/i));
        fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

        expect(handlers.onSuspendPatient).toHaveBeenCalledWith(
            expect.objectContaining({ id: 20 }),
            expect.stringMatching(/Efecto/i),
            ''
        );
    });
});
