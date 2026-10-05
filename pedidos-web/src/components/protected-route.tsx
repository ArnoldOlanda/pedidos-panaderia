import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../store/auth';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  if (status === 'idle' || status === 'loading') {
    // A live region has to pre-exist and announce its own content change. This
    // component early-returns a different root per state, so there is no stable
    // parent to hold the region: the loading root itself is the region.
    return (
      <div role="status" className="p-8 text-center text-muted-foreground">
        Cargando…
      </div>
    );
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
