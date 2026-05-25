
import { describe, it, expect } from 'vitest';
import { formatMedicationCode, formatDateMMYYYY } from './formatters';

describe('formatMedicationCode', () => {
    it('formats clean code correctly', () => {
        expect(formatMedicationCode('01234567890')).toBe('0-12-34-567890');
    });

    it('handles partial inputs', () => {
        expect(formatMedicationCode('0')).toBe('0');
        expect(formatMedicationCode('01')).toBe('0-1');
        expect(formatMedicationCode('012')).toBe('0-12');
        expect(formatMedicationCode('0123')).toBe('0-12-3');
        expect(formatMedicationCode('012345')).toBe('0-12-34-5');
    });

    it('removes non-digits', () => {
        expect(formatMedicationCode('0-1a2.3')).toBe('0-12-3');
    });

    it('truncates overflow', () => {
        // 11 digits max
        const input = '01234567890123';
        const expected = '0-12-34-567890'; // 11 digits formatted
        expect(formatMedicationCode(input)).toBe(expected);
    });
});

describe('formatDateMMYYYY', () => {
    it('formats clean date correctly', () => {
        expect(formatDateMMYYYY('012025')).toBe('01/2025');
    });

    it('handles partial inputs', () => {
        expect(formatDateMMYYYY('01')).toBe('01');
        expect(formatDateMMYYYY('012')).toBe('01/2');
    });

    it('removes non-digits', () => {
        expect(formatDateMMYYYY('01/aa')).toBe('01');
    });
});
