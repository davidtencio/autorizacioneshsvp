
export const fetchDrugLabel = async (drugName: string) => {
    try {
        const normalizedDrugName = drugName.trim().replace(/["\\]/g, ' ').replace(/\s+/g, ' ');
        if (!normalizedDrugName) {
            return null;
        }

        // Search by brand name OR generic name
        const params = new URLSearchParams({
            search: `openfda.brand_name:"${normalizedDrugName}" OR openfda.generic_name:"${normalizedDrugName}"`,
            limit: '1'
        });
        const response = await fetch(`https://api.fda.gov/drug/label.json?${params.toString()}`);

        if (!response.ok) {
            if (response.status === 404) {
                return null; // Not found
            }
            throw new Error(`FDA API Error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.results && data.results.length > 0 ? data.results[0] : null;
    } catch (error) {
        console.error("Error fetching FDA label:", error);
        throw error;
    }
};
