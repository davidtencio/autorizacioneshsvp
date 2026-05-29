import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { User } from 'firebase/auth';

type SnapshotHandler = (snap: { exists: () => boolean; data: () => unknown }) => void;
type ErrorHandler = (err: { code?: string; message?: string }) => void;

let lastOnNext: SnapshotHandler | null = null;
let lastOnError: ErrorHandler | null = null;
const unsubMock = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => ({ path: args.join('/') }),
  onSnapshot: (_ref: unknown, onNext: SnapshotHandler, onError: ErrorHandler) => {
    lastOnNext = onNext;
    lastOnError = onError;
    return unsubMock;
  },
}));
vi.mock('../firebase/firestore', () => ({ db: {} as unknown }));

import { useRole } from './useRole';

const mockUser = (uid = 'u-1'): User =>
  ({ uid, email: 'a@b.com', isAnonymous: false }) as unknown as User;

describe('useRole', () => {
  beforeEach(() => {
    lastOnNext = null;
    lastOnError = null;
    unsubMock.mockReset();
  });

  it('null user: returns idle state, no subscription', () => {
    const { result } = renderHook(() => useRole(null));
    expect(result.current.role).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.hasRoleDoc).toBe(false);
  });

  it('user present: starts loading, then loads role from snapshot', async () => {
    const user = mockUser();
    const { result } = renderHook(() => useRole(user));
    expect(result.current.loading).toBe(true);

    act(() => {
      lastOnNext?.({
        exists: () => true,
        data: () => ({ role: 'editor' }),
      });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.role).toBe('editor');
    expect(result.current.hasRoleDoc).toBe(true);
  });

  it('snapshot with non-existent doc returns hasRoleDoc=false', async () => {
    const user = mockUser();
    const { result } = renderHook(() => useRole(user));
    act(() => {
      lastOnNext?.({
        exists: () => false,
        data: () => undefined,
      });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBeNull();
    expect(result.current.hasRoleDoc).toBe(false);
  });

  it('invalid role value coerces to null but keeps hasRoleDoc=true', async () => {
    const user = mockUser();
    const { result } = renderHook(() => useRole(user));
    act(() => {
      lastOnNext?.({
        exists: () => true,
        data: () => ({ role: 'banana' }),
      });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBeNull();
    expect(result.current.hasRoleDoc).toBe(true);
  });

  it('snapshot error resets to idle without throwing', async () => {
    const user = mockUser();
    const { result } = renderHook(() => useRole(user));
    act(() => {
      lastOnError?.({ code: 'permission-denied', message: 'no' });
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBeNull();
    expect(result.current.hasRoleDoc).toBe(false);
  });

  it('user change unsubscribes previous listener', () => {
    const { rerender } = renderHook(({ user }) => useRole(user), {
      initialProps: { user: mockUser('u-1') as User | null },
    });
    expect(unsubMock).not.toHaveBeenCalled();
    rerender({ user: mockUser('u-2') });
    expect(unsubMock).toHaveBeenCalledTimes(1);
  });
});
