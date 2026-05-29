import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { DashboardView } from '../views/DashboardView';
import type { Medication } from '../types';

// Mock ResizeObserver for Virtuoso
vi.stubGlobal('ResizeObserver', class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
});

// Mock react-virtuoso
vi.mock('react-virtuoso', () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Virtuoso: ({ data, itemContent }: any) => (
        <div>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {data.map((item: any, index: number) => (
                <div key={index}>
                    {itemContent(index, item)}
                </div>
            ))}
        </div>
    ),
    VirtuosoGrid: ({ totalCount, itemContent }: { totalCount: number; itemContent: (index: number) => unknown }) => (
        <div>
            {Array.from({ length: totalCount }).map((_, index) => (
                <div key={index}>{itemContent(index)}</div>
            ))}
        </div>
    ),
}));

// Mock Hooks
vi.mock('../hooks/useAuth', () => ({
    useAuth: () => ({
        user: { email: 'test@hsvp.com' }, // Authenticated user
    }),
}));

vi.mock('../utils/permissions', () => ({
    canEdit: () => true,
    canEditWithRole: () => true,
}));

vi.mock('../hooks/useCanEdit', () => ({
    useCanEdit: () => true,
}));

describe('Data Visibility Regression Test', () => {
    // Data strictly based on the user's screenshot
    const mockMedications: Medication[] = [
        {
            id: 'kCSkIy5CESskToAm4n7', // ID from screenshot
            code: '1-11-41-0192',
            name: 'CABAZITAXEL',
            strength: '60 MG',
            route: 'INTRAVENOSA',
            type: 'General',
            category: 'Compra Local',
            patients: [] // Empty array as per common initial state
        }
    ];

    it('renders the medication from Firestore data correctly', () => {
        render(
            <MemoryRouter>
                <DashboardView
                    medications={mockMedications}
                    loading={false}
                    searchQuery=""
                    setSearchQuery={() => { }}
                    onMedClick={() => { }}
                    onNewMed={() => { }}
                    onAddPrescriber={() => { }}
                    onLoadMore={() => { }}
                    limitCount={30}
                    hasMore={false}
                    onLogout={() => { }}
                    onViewFDA={() => { }}
                />
            </MemoryRouter>
        );

        // Assertions
        // 1. Check if the name appears
        expect(screen.getByText('CABAZITAXEL')).toBeDefined();

        // 2. Check if the code appears
        // Using getByText with exact: false or regex usually safer for formatted text, 
        // but here we expect it to be rendered plainly or with formatting.
        // Dashboard renders: <FileText size={12} /> {med.code}
        expect(screen.getByText('1-11-41-0192')).toBeDefined();

        // 3. Check extra fields
        expect(screen.getByText('60 MG')).toBeDefined();
        expect(screen.getByText('Compra Local')).toBeDefined();
    });

    it('renders loading state when no data and loading is true', () => {
        render(
            <MemoryRouter>
                <DashboardView
                    medications={[]}
                    loading={true}
                    searchQuery=""
                    setSearchQuery={() => { }}
                    onMedClick={() => { }}
                    onNewMed={() => { }}
                    onAddPrescriber={() => { }}
                    onLoadMore={() => { }}
                    limitCount={30}
                    hasMore={true}
                    onLogout={() => { }}
                    onViewFDA={() => { }}
                />
            </MemoryRouter>
        );

        // Should not see the medication
        expect(screen.queryByText('CABAZITAXEL')).toBeNull();
    });
});
