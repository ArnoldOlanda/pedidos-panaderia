import { ReactNode } from 'react';
import { useAuth } from '../store/auth';
import { useAuthBootstrap } from '../hooks/use-auth-bootstrap';

export function AuthBootstrap({ children }: { children: ReactNode }) {
  useAuthBootstrap();
  const status = useAuth((s) => s.status);
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Cargando…
      </div>
    );
  }
  return <>{children}</>;
}
