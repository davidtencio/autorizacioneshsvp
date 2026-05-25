import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { UIProvider } from './context/UIContext';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

const LoginView = lazy(() => import('./views/LoginView'));
const ProtectedAppShell = lazy(() => import('./ProtectedAppShell').then((m) => ({ default: m.ProtectedAppShell })));

const FullscreenLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-emerald-800 font-bold animate-pulse">Cargando aplicación...</div>
  </div>
);

const ProtectedEntry = () => {
  const { user, loading } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <Suspense fallback={<FullscreenLoader />}>
      <ProtectedAppShell />
    </Suspense>
  );
};

const PublicEntry = () => {
  const { user, loading } = useAuth();

  if (loading) return <FullscreenLoader />;
  if (user) return <Navigate to="/" replace />;

  return (
    <Suspense fallback={<FullscreenLoader />}>
      <LoginView />
    </Suspense>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UIProvider>
          <Routes>
            <Route path="/login" element={<PublicEntry />} />
            <Route path="/*" element={<ProtectedEntry />} />
          </Routes>
        </UIProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
