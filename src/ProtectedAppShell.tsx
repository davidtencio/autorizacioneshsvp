import { Suspense, lazy } from 'react';

const FirestoreWorkspace = lazy(() => import('./FirestoreWorkspace').then((m) => ({ default: m.FirestoreWorkspace })));

const WorkspaceLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-emerald-800 font-bold animate-pulse">Cargando datos...</div>
  </div>
);

export const ProtectedAppShell = () => (
  <Suspense fallback={<WorkspaceLoader />}>
    <FirestoreWorkspace />
  </Suspense>
);
