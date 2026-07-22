import type { TransferControl } from '../types';

/**
 * Computes the pending balance of units still to be transferred to Hospital
 * México for a given transfer control record.
 *
 * Recomputes from totalUnits minus the sum of the registered transfers when the
 * total is available (the most truthful value), and falls back to the stored
 * pendingBalance for records that only carry that field.
 *
 * Returns null when there is no transfer control data to derive a balance from,
 * so callers can distinguish "no record yet" from a real zero balance.
 */
export const getPendingTransferBalance = (
  transferControl: TransferControl | undefined | null
): number | null => {
  if (!transferControl) return null;

  const { pendingBalance, totalUnits, transfers } = transferControl;

  if (totalUnits !== undefined && totalUnits.trim() !== '') {
    const total = parseFloat(totalUnits) || 0;
    const transferred = (transfers ?? []).reduce(
      (acc, curr) => acc + (parseFloat(curr) || 0),
      0
    );
    return total - transferred;
  }

  if (pendingBalance !== undefined && pendingBalance.trim() !== '') {
    const parsed = parseFloat(pendingBalance);
    if (!isNaN(parsed)) return parsed;
  }

  return null;
};
