import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { fetchDrugLabel } from './fdaService';

const fetchMock = vi.fn();

function mockResponse(init: { ok: boolean; status?: number; json?: unknown }) {
  return {
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: init.ok ? 'OK' : 'Error',
    json: async () => init.json ?? {},
  } as Response;
}

describe('fdaService.fetchDrugLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns null for empty input without calling fetch', async () => {
    const result = await fetchDrugLabel('   ');
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns first result on 200 OK', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, json: { results: [{ openfda: { brand_name: ['X'] } }] } })
    );
    const result = await fetchDrugLabel('Aspirin');
    expect(result).toEqual({ openfda: { brand_name: ['X'] } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns null when results array is empty', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, json: { results: [] } }));
    const result = await fetchDrugLabel('Unknown');
    expect(result).toBeNull();
  });

  it('returns null on 404 without retrying', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, status: 404 }));
    const result = await fetchDrugLabel('Foo');
    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries on 500, succeeds on 2nd attempt', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ ok: false, status: 500 }))
      .mockResolvedValueOnce(mockResponse({ ok: true, json: { results: [{ id: 'OK' }] } }));

    const promise = fetchDrugLabel('Foo');
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toEqual({ id: 'OK' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('retries on 429 (rate limit)', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse({ ok: false, status: 429 }))
      .mockResolvedValueOnce(mockResponse({ ok: true, json: { results: [{ id: 'X' }] } }));

    const promise = fetchDrugLabel('Foo');
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ id: 'X' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws after exhausting retries (3 attempts)', async () => {
    fetchMock.mockResolvedValue(mockResponse({ ok: false, status: 500 }));

    let caught: unknown;
    const promise = fetchDrugLabel('Foo').catch((e: unknown) => {
      caught = e;
    });
    await vi.runAllTimersAsync();
    await promise;
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/FDA API Error: 500/);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries on network error (fetch rejects)', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValueOnce(mockResponse({ ok: true, json: { results: [{ id: 'X' }] } }));

    const promise = fetchDrugLabel('Foo');
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ id: 'X' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT retry on definitively non-retryable status (400)', async () => {
    fetchMock.mockResolvedValue(mockResponse({ ok: false, status: 400 }));
    let caught: unknown;
    const promise = fetchDrugLabel('Foo').catch((e: unknown) => {
      caught = e;
    });
    await vi.runAllTimersAsync();
    await promise;
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toMatch(/FDA API Error: 400/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
