import { describe, expect, it } from 'vitest';
import type { User } from 'firebase/auth';
import { canEdit, canEditWithRole } from './permissions';
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

describe('canEdit (legacy)', () => {
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

describe('canEditWithRole (hybrid)', () => {
    it('returns false while role state is loading', () => {
        expect(canEditWithRole(mockUser({}), roleState({ loading: true }))).toBe(false);
    });

    it('with users/{uid} doc: admin can edit', () => {
        expect(canEditWithRole(mockUser({}), roleState({ hasRoleDoc: true, role: 'admin' }))).toBe(true);
    });

    it('with users/{uid} doc: editor can edit', () => {
        expect(canEditWithRole(mockUser({}), roleState({ hasRoleDoc: true, role: 'editor' }))).toBe(true);
    });

    it('with users/{uid} doc: viewer cannot edit', () => {
        expect(canEditWithRole(mockUser({}), roleState({ hasRoleDoc: true, role: 'viewer' }))).toBe(false);
    });

    it('with users/{uid} doc: null role cannot edit', () => {
        expect(canEditWithRole(mockUser({}), roleState({ hasRoleDoc: true, role: null }))).toBe(false);
    });

    it('without users/{uid} doc: legacy fallback applies (read-only email blocked)', () => {
        expect(
            canEditWithRole(mockUser({ email: 'fhsvp2208@gmail.com' }), roleState({ hasRoleDoc: false }))
        ).toBe(false);
    });

    it('without users/{uid} doc: legacy fallback applies (regular email allowed)', () => {
        expect(
            canEditWithRole(mockUser({ email: 'oncologia@hsvp.com' }), roleState({ hasRoleDoc: false }))
        ).toBe(true);
    });

    it('rejects anonymous regardless of role state', () => {
        expect(
            canEditWithRole(mockUser({ isAnonymous: true, email: null }), roleState({ hasRoleDoc: true, role: 'admin' }))
        ).toBe(false);
    });
});
