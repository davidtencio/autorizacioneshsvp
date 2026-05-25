
export const formatMedicationCode = (value: string): string => {
    let clean = value.replace(/\D/g, '');
    if (clean.length > 11) clean = clean.slice(0, 11);

    let formatted = clean;
    if (clean.length > 1) formatted = `${clean.slice(0, 1)}-${clean.slice(1)}`;
    if (clean.length > 3) formatted = `${clean.slice(0, 1)}-${clean.slice(1, 3)}-${clean.slice(3)}`;
    if (clean.length > 5) formatted = `${clean.slice(0, 1)}-${clean.slice(1, 3)}-${clean.slice(3, 5)}-${clean.slice(5)}`;

    return formatted;
};

export const formatDateMMYYYY = (value: string): string => {
    const clean = value.replace(/\D/g, '');
    if (clean.length > 6) return value; // Or truncate if we want strict length, but logic was length > 2 check

    let formatted = clean;
    if (clean.length > 2) {
        formatted = `${clean.slice(0, 2)}/${clean.slice(2, 6)}`;
    }
    return formatted;
};
