import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebase/firestore';
import { logger } from '../utils/logger';

export type Role = 'admin' | 'editor' | 'viewer';

const VALID_ROLES: ReadonlySet<string> = new Set(['admin', 'editor', 'viewer']);

export interface RoleState {
  role: Role | null;
  loading: boolean;
  hasRoleDoc: boolean;
}

export function useRole(user: User | null): RoleState {
  const [state, setState] = useState<RoleState>({
    role: null,
    loading: !!user,
    hasRoleDoc: false,
  });

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ role: null, loading: false, hasRoleDoc: false });
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, loading: true }));
    const unsub = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (!snap.exists()) {
          setState({ role: null, loading: false, hasRoleDoc: false });
          return;
        }
        const raw = snap.data()?.role;
        const role = typeof raw === 'string' && VALID_ROLES.has(raw) ? (raw as Role) : null;
        setState({ role, loading: false, hasRoleDoc: true });
      },
      (err) => {
        logger.error('useRole snapshot failed', { code: err.code, message: err.message });
        setState({ role: null, loading: false, hasRoleDoc: false });
      }
    );
    return () => unsub();
  }, [user]);

  return state;
}
