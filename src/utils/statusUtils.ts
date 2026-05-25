
/**
 * Checks if the authorization is expired based on the end month.
 * The authorization is considered expired if the current date is in a month SUBSEQUENT
 * to the end month.
 * 
 * @param endMonth - The end month in "MM/YYYY" format.
 * @returns true if expired, false otherwise.
 */
export const isAuthorizationExpired = (endMonth: string): boolean => {
    if (!endMonth || endMonth.length !== 7) return false;

    const [monthStr, yearStr] = endMonth.split('/');
    const endMonthNum = parseInt(monthStr, 10);
    const endYearNum = parseInt(yearStr, 10);

    if (isNaN(endMonthNum) || isNaN(endYearNum)) return false;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed

    if (currentYear > endYearNum) return true;
    if (currentYear === endYearNum && currentMonth > endMonthNum) return true;

    return false;
};
