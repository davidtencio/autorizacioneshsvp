
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { isAuthorizationExpired, parseMonthYear } from './statusUtils';

describe('parseMonthYear', () => {
    it('parses MM/YYYY format', () => {
        expect(parseMonthYear('05/2025')).toEqual({ month: 5, year: 2025 });
    });

    it('parses legacy MMYYYY (6-digit) format', () => {
        expect(parseMonthYear('122026')).toEqual({ month: 12, year: 2026 });
    });

    it('returns null for empty, malformed or out-of-range values', () => {
        expect(parseMonthYear('')).toBeNull();
        expect(parseMonthYear(null)).toBeNull();
        expect(parseMonthYear('12/24')).toBeNull(); // too short
        expect(parseMonthYear('xx/xxxx')).toBeNull();
        expect(parseMonthYear('13/2025')).toBeNull(); // invalid month
    });
});

describe('isAuthorizationExpired', () => {
    beforeEach(() => {
        // Mock date to 2025-06-15
        vi.useFakeTimers();
        vi.setSystemTime(new Date(2025, 5, 15)); // Month is 0-indexed: 5 is June
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should return false for invalid format', () => {
        expect(isAuthorizationExpired('')).toBe(false);
        expect(isAuthorizationExpired('12/24')).toBe(false); // too short
        expect(isAuthorizationExpired('xx/xxxx')).toBe(false);
    });

    it('should return false if endMonth is in future year', () => {
        expect(isAuthorizationExpired('01/2026')).toBe(false);
    });

    it('should return false if endMonth is same as current month', () => {
        expect(isAuthorizationExpired('06/2025')).toBe(false);
    });

    it('should return false if endMonth is in future month of same year', () => {
        expect(isAuthorizationExpired('12/2025')).toBe(false);
    });

    it('should return true if endMonth is in previous month of same year', () => {
        // Current: June 2025. End: May 2025 -> Expired
        expect(isAuthorizationExpired('05/2025')).toBe(true);
    });

    it('should return true if endMonth is in previous year', () => {
        expect(isAuthorizationExpired('12/2024')).toBe(true);
    });

    it('should handle legacy MMYYYY format (expired)', () => {
        // Current: June 2025. End: May 2025 -> Expired
        expect(isAuthorizationExpired('052025')).toBe(true);
    });

    it('should handle legacy MMYYYY format (not expired)', () => {
        expect(isAuthorizationExpired('122025')).toBe(false);
    });
});
