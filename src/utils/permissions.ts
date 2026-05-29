import type { User } from 'firebase/auth';
import type { Role, RoleState } from '../hooks/useRole';

export const READ_ONLY_USERS = ['fhsvp2208@gmail.com'];

const EDITOR_ROLES: ReadonlySet<Role> = new Set<Role>(['admin', 'editor']);

/**
 * Legacy email-list check. Kept for fallback while users/{uid} is being seeded.
 * Returns true if the user is allowed to write under the legacy model
 * (signed-in, non-anonymous, not in the read-only whitelist).
 */
export const canEdit = (user: User | null): boolean => {
  if (!user) return false;
  if (user.isAnonymous || !user.email) return false;
  return !READ_ONLY_USERS.includes(user.email);
};

/**
 * Hybrid permission check. Prefers users/{uid}.role when available;
 * falls back to legacy email-list while the role doc is missing.
 *
 *   hasRoleDoc=true  → role must be admin|editor
 *   hasRoleDoc=false → legacy canEdit(user) applies
 */
export const canEditWithRole = (
  user: User | null,
  roleState: Pick<RoleState, 'role' | 'hasRoleDoc' | 'loading'>
): boolean => {
  if (!user) return false;
  if (roleState.loading) return false;
  if (user.isAnonymous || !user.email) return false;
  if (roleState.hasRoleDoc) {
    return roleState.role !== null && EDITOR_ROLES.has(roleState.role);
  }
  return canEdit(user);
};
