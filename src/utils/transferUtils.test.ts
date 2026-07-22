import { describe, expect, it } from 'vitest';
import { getPendingTransferBalance } from './transferUtils';

describe('getPendingTransferBalance', () => {
  it('returns null when there is no transfer control record', () => {
    expect(getPendingTransferBalance(undefined)).toBeNull();
    expect(getPendingTransferBalance(null)).toBeNull();
    expect(getPendingTransferBalance({})).toBeNull();
  });

  it('recomputes total minus the sum of registered transfers', () => {
    expect(
      getPendingTransferBalance({ totalUnits: '10', transfers: ['3', '2'] })
    ).toBe(5);
  });

  it('treats blank / non-numeric transfer slots as zero', () => {
    expect(
      getPendingTransferBalance({ totalUnits: '10', transfers: ['', '4', 'x', '  '] })
    ).toBe(6);
  });

  it('handles a total with no transfers registered yet', () => {
    expect(getPendingTransferBalance({ totalUnits: '8' })).toBe(8);
  });

  it('can return a negative balance when more was transferred than the total', () => {
    expect(
      getPendingTransferBalance({ totalUnits: '5', transfers: ['4', '3'] })
    ).toBe(-2);
  });

  it('falls back to the stored pendingBalance when totalUnits is absent', () => {
    expect(getPendingTransferBalance({ pendingBalance: '7' })).toBe(7);
  });

  it('ignores an empty stored pendingBalance', () => {
    expect(getPendingTransferBalance({ pendingBalance: '   ' })).toBeNull();
  });
});
