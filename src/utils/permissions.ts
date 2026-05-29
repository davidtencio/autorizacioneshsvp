import type { User } from 'firebase/auth';
import type { Role, RoleState } from '../hooks/useRole';

const EDITOR_ROLES: ReadonlySet<Role> = new Set<Role>(['admin', 'editor']);

/**
 * Strict whitelist permission check.
 *
 *   - No user / anonymous / no email   → false.
 *   - Role doc still loading           → false (avoid flashing edit UI).
 *   - users/{uid} doc missing          → false (no implicit access).
 *   - users/{uid}.role missing/invalid → false.
 *   - users/{uid}.role ∈ {admin, editor} → true.
 *
 * The previous hybrid mode (legacy email-list fallback) was retired once
 * all current editors were seeded via scripts/auth/seed-user-roles.mjs.
 */
export const canEditWithRole = (
  user: User | null,
  roleState: Pick<RoleState, 'role' | 'hasRoleDoc' | 'loading'>
): boolean => {
  if (!user) return false;
  if (roleState.loading) return false;
  if (user.isAnonymous || !user.email) return false;
  if (!roleState.hasRoleDoc) return false;
  return roleState.role !== null && EDITOR_ROLES.has(roleState.role);
};
