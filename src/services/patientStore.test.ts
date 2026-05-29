import { describe, expect, it } from 'vitest';
import type { Patient } from '../types';

// patientStore imports firebase/firestore at module load.
import { buildPatientsSummary } from './patientStore';

const p = (overrides: Partial<Patient> = {}): Patient => ({
  id: 1,
  identificationNumber: '1',
  name: 'A',
  diagnosis: 'd',
  authorizationCode: 'c',
  issuer: 'CCF',
  startMonth: '01/2026',
  endMonth: '12/2026',
  dose: '1',
  frequency: 'q',
  route: 'IV',
  totalCycles: '1',
  totalMonths: '1',
  applicationPlace: 'X',
  prescriber: 'p',
  specialty: 's',
  ...overrides,
});

describe('buildPatientsSummary', () => {
  it('returns count=0 with today as lastUpdated for empty input', () => {
    const summary = buildPatientsSummary([]);
    expect(summary.count).toBe(0);
    expect(summary.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('counts patients and picks the latest endMonth (MM/YYYY)', () => {
    const summary = buildPatientsSummary([
      p({ id: 1, endMonth: '01/2026' }),
      p({ id: 2, endMonth: '12/2026' }),
      p({ id: 3, endMonth: '06/2026' }),
    ]);
    expect(summary.count).toBe(3);
    expect(summary.lastUpdated).toBe('12/2026');
  });

  it('ignores malformed date strings (e.g. "82/6")', () => {
    const summary = buildPatientsSummary([
      p({ id: 1, endMonth: '82/6' }),
      p({ id: 2, endMonth: '03/2026' }),
    ]);
    expect(summary.count).toBe(2);
    expect(summary.lastUpdated).toBe('03/2026');
  });

  it('accepts ISO YYYY-MM-DD prefixes', () => {
    const summary = buildPatientsSummary([
      p({ id: 1, suspensionDate: '2026-05-29T12:34:56.000Z' }),
      p({ id: 2, endMonth: '01/2026' }),
    ]);
    expect(summary.count).toBe(2);
    // ISO 2026-05-29... is lexicographically greater than '01/2026' since they
    // use different first chars; but isolated MM/YYYY 12/2026 would still win.
    // Here, only one MM/YYYY (01/2026) and one ISO; ISO wins.
    expect(summary.lastUpdated).toBe('2026-05-29T12:34:56.000Z');
  });

  it('falls back to today when no candidate fields are valid', () => {
    const summary = buildPatientsSummary([
      p({ id: 1, startMonth: '', endMonth: 'bogus', suspensionDate: undefined }),
    ]);
    expect(summary.count).toBe(1);
    expect(summary.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
