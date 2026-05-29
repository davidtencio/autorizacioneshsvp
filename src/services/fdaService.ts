
import { logger } from '../utils/logger';

const FDA_BASE_URL = 'https://api.fda.gov/drug/label.json';
const REQUEST_TIMEOUT_MS = 8000;
const RETRY_DELAYS_MS = [250, 800];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
};

const shouldRetry = (status: number) => status === 429 || status >= 500;

// Flag attached to errors that exhausted retries so the outer catch knows
// not to retry them again. Avoids the previous bug where a 400 (never
// retryable by status) would still be retried 3 times via the outer catch.
class FdaHttpError extends Error {
    readonly status: number;
    constructor(status: number, statusText: string) {
        super(`FDA API Error: ${status} ${statusText}`);
        this.name = 'FdaHttpError';
        this.status = status;
    }
}

export const fetchDrugLabel = async (drugName: string) => {
    const normalizedDrugName = drugName.trim().replace(/["\\]/g, ' ').replace(/\s+/g, ' ');
    if (!normalizedDrugName) {
        return null;
    }

    const params = new URLSearchParams({
        search: `openfda.brand_name:"${normalizedDrugName}" OR openfda.generic_name:"${normalizedDrugName}"`,
        limit: '1'
    });
    const requestUrl = `${FDA_BASE_URL}?${params.toString()}`;

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
            const response = await fetchWithTimeout(requestUrl, REQUEST_TIMEOUT_MS);

            if (!response.ok) {
                if (response.status === 404) return null;
                if (shouldRetry(response.status) && attempt < RETRY_DELAYS_MS.length) {
                    await sleep(RETRY_DELAYS_MS[attempt]);
                    continue;
                }
                throw new FdaHttpError(response.status, response.statusText);
            }

            const data = await response.json();
            return data.results && data.results.length > 0 ? data.results[0] : null;
        } catch (error) {
            const isAbort = error instanceof Error && error.name === 'AbortError';
            const isUnretryableHttp = error instanceof FdaHttpError;
            if (!isUnretryableHttp && attempt < RETRY_DELAYS_MS.length) {
                await sleep(RETRY_DELAYS_MS[attempt]);
                continue;
            }
            logger.error('fda_fetch_failed', {
                drugName: normalizedDrugName,
                timeout: isAbort,
                attempt: attempt + 1,
                error: error instanceof Error ? error.message : String(error),
            });
            throw error;
        }
    }

    return null;
};
