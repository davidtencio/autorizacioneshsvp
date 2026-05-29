import { describe, expect, it } from 'vitest';
import type { User } from 'firebase/auth';
import { canEditWithRole } from './permissions';
import type { RoleState } from '../hooks/useRole';

const mockUser = (overrides: Partial<User>): User => ({
    isAnonymous: false,
    email: 'editor@hsvp.com',
    ...overrides
} as User);

const roleState = (overrides: Partial<RoleState> = {}): RoleState => ({
    role: null,
    loading: false,
    hasRoleDoc: false,
    ...overrides,
});

describe('canEditWithRole (strict whitelist)', () => {
    it('returns false for unauthenticated users', () => {
        expect(canEditWithRole(null, roleState())).toBe(false);
    });

    it('returns false while role state is loading', () => {
        expect(canEditWithRole(mockUser({}), roleState({ loading: true }))).toBe(false);
    });

    it('rejects anonymous regardless of role state', () => {
        expect(
            canEditWithRole(
                mockUser({ isAnonymous: true, email: null }),
                roleState({ hasRoleDoc: true, role: 'admin' })
            )
        ).toBe(false);
    });

    it('rejects user without users/{uid} doc (no implicit access)', () => {
        expect(
            canEditWithRole(mockUser({ email: 'anyone@hsvp.com' }), roleState({ hasRoleDoc: false }))
        ).toBe(false);
    });

    it('admin role: can edit', () => {
        expect(canEditWithRole(mockUser({}), roleState({ hasRoleDoc: true, role: 'admin' }))).toBe(true);
    });

    it('editor role: can edit', () => {
        expect(canEditWithRole(mockUser({}), roleState({ hasRoleDoc: true, role: 'editor' }))).toBe(true);
    });

    it('viewer role: cannot edit', () => {
        expect(canEditWithRole(mockUser({}), roleState({ hasRoleDoc: true, role: 'viewer' }))).toBe(false);
    });

    it('null role with doc present: cannot edit', () => {
        expect(canEditWithRole(mockUser({}), roleState({ hasRoleDoc: true, role: null }))).toBe(false);
    });
});
