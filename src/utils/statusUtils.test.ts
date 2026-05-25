
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { isAuthorizationExpired } from './statusUtils';

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
});
