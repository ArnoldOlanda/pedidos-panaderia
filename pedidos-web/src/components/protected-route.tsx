import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  if (status === 'idle' || status === 'loading') {
    return <div className="p-8 text-center text-slate-500">Cargando…</div>;
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}