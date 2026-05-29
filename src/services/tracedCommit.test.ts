import { describe, expect, it, vi, beforeEach } from 'vitest';

const { loggerInfoMock, loggerErrorMock } = vi.hoisted(() => ({
  loggerInfoMock: vi.fn(),
  loggerErrorMock: vi.fn(),
}));
vi.mock('../utils/logger', () => ({
  logger: { info: loggerInfoMock, warn: vi.fn(), error: loggerErrorMock },
}));

import { tracedCommit } from './tracedCommit';

describe('tracedCommit', () => {
  beforeEach(() => {
    loggerInfoMock.mockReset();
    loggerErrorMock.mockReset();
  });

  it('logs firestore_commit_ok with op + context on success', async () => {
    const batch = { commit: vi.fn().mockResolvedValue(undefined) } as unknown as Parameters<
      typeof tracedCommit
    >[1];
    await tracedCommit('upsertPatient', batch, { medId: 'm1', patientId: '7' });
    expect(loggerInfoMock).toHaveBeenCalledWith(
      'firestore_commit_ok',
      expect.objectContaining({ op: 'upsertPatient', medId: 'm1', patientId: '7' })
    );
    // durationMs should be a number >= 0.
    expect(loggerInfoMock.mock.calls[0]?.[1]).toHaveProperty('durationMs');
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });

  it('logs firestore_commit_failed with Firebase code and rethrows', async () => {
    const err = Object.assign(new Error('Missing or insufficient permissions.'), {
      code: 'permission-denied',
      name: 'FirebaseError',
    });
    const batch = { commit: vi.fn().mockRejectedValue(err) } as unknown as Parameters<
      typeof tracedCommit
    >[1];

    await expect(
      tracedCommit('deletePatient', batch, { medId: 'm1' })
    ).rejects.toThrow(/insufficient permissions/);

    expect(loggerErrorMock).toHaveBeenCalledWith(
      'firestore_commit_failed',
      expect.objectContaining({
        op: 'deletePatient',
        medId: 'm1',
        code: 'permission-denied',
        name: 'FirebaseError',
        message: expect.stringContaining('permissions'),
      })
    );
  });

  it('handles non-Error rejections gracefully', async () => {
    const batch = { commit: vi.fn().mockRejectedValue('plain-string-error') } as unknown as Parameters<
      typeof tracedCommit
    >[1];

    await expect(tracedCommit('op', batch)).rejects.toBe('plain-string-error');
    expect(loggerErrorMock).toHaveBeenCalledWith(
      'firestore_commit_failed',
      expect.objectContaining({ op: 'op', message: 'plain-string-error' })
    );
  });
});
