
/**
 * Parses an authorization month into its numeric { month, year } components.
 *
 * Tolerates the two formats that can coexist in the data set:
 *   - "MM/YYYY" (current form output, length 7)
 *   - "MMYYYY"  (legacy 6-digit values)
 *
 * Returns null when the value is empty or cannot be parsed into a valid
 * 1-12 month and a 4-digit year.
 */
export const parseMonthYear = (
    value: string | undefined | null
): { month: number; year: number } | null => {
    if (!value) return null;

    const digits = value.replace(/\D/g, '');
    if (digits.length !== 6) return null;

    const month = parseInt(digits.slice(0, 2), 10);
    const year = parseInt(digits.slice(2), 10);

    if (isNaN(month) || isNaN(year)) return null;
    if (month < 1 || month > 12) return null;

    return { month, year };
};

/**
 * Checks if the authorization is expired based on the end month.
 * The authorization is considered expired if the current date is in a month SUBSEQUENT
 * to the end month.
 *
 * @param endMonth - The end month in "MM/YYYY" or legacy "MMYYYY" format.
 * @returns true if expired, false otherwise.
 */
export const isAuthorizationExpired = (endMonth: string): boolean => {
    const parsed = parseMonthYear(endMonth);
    if (!parsed) return false;

    const { month: endMonthNum, year: endYearNum } = parsed;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    if (currentYear > endYearNum) return true;
    if (currentYear === endYearNum && currentMonth > endMonthNum) return true;

    return false;
};
