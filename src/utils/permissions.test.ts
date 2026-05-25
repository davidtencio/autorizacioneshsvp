import { describe, expect, it } from 'vitest';
import type { User } from 'firebase/auth';
import { canEdit } from './permissions';

const mockUser = (overrides: Partial<User>): User => ({
    isAnonymous: false,
    email: 'editor@hsvp.com',
    ...overrides
} as User);

describe('canEdit', () => {
    it('returns false for unauthenticated users', () => {
        expect(canEdit(null)).toBe(false);
    });

    it('returns false for anonymous users', () => {
        expect(canEdit(mockUser({ isAnonymous: true, email: null }))).toBe(false);
    });

    it('returns false for read-only users', () => {
        expect(canEdit(mockUser({ email: 'fhsvp2208@gmail.com' }))).toBe(false);
    });

    it('returns true for authenticated non read-only users', () => {
        expect(canEdit(mockUser({ email: 'oncologia@hsvp.com' }))).toBe(true);
    });
});
