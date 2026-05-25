
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Hooks to avoid Firebase calls

// Mock ResizeObserver for Virtuoso
vi.stubGlobal('ResizeObserver', class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
});

vi.mock('./hooks/useAuth', () => ({
    useAuth: () => ({
        user: null,
        loading: true, // Force loading state if logic depends on it, but App has its own fallback for lazy routes
        logout: vi.fn()
    })
}));

vi.mock('./hooks/useMedications', () => ({
    useMedications: () => ({
        medications: [],
        loading: false,
        error: null,
        addMedication: vi.fn(),
        updateMedication: vi.fn(),
        deleteMedication: vi.fn(),
        loadMore: vi.fn(),
        limitCount: 30,
        hasMore: false
    })
}));

vi.mock('./hooks/usePrescribers', () => ({
    usePrescribers: () => ({
        prescribers: [],
        loading: false,
        addPrescriber: vi.fn(),
        updatePrescriber: vi.fn(),
        deletePrescriber: vi.fn()
    })
}));

// Mock Firebase
vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(),
    onAuthStateChanged: vi.fn(() => vi.fn())
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    initializeFirestore: vi.fn(),
    persistentLocalCache: vi.fn(),
    persistentMultipleTabManager: vi.fn()
}));

// Mock Lazy Components to avoid Suspense issues if needed, strictly fallback is fine
// But if we want to ensure "Cargando" is visible, we rely on Suspense or Auth loading.
// App.tsx shows Suspense fallback while routes lazy load.

describe('App', () => {
    it('renders without crashing', async () => {
        render(<App />);
        // useAuth mock returns loading: true? 
        // Actually AppContent doesn't use auth loading to block render, AuthProvider does. 
        // But we are rendering App which contains AuthProvider.
        // If AuthProvider handles loading internally, we might see nothing or children.
        // Let's rely on finding *something*. usage of "Cargando" might be transient.
        // If we default to user: null, ProtectedRoute should redirect to login.
        // LoginView is lazy loaded. So we should see "Cargando aplicación..." from Suspense.

        const loadingElement = await screen.findByText(/Cargando/i);
        expect(loadingElement).toBeInTheDocument();
    });
});
