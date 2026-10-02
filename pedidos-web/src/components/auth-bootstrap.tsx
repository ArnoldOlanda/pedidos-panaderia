import { ReactNode } from 'react';
import { useAuth } from '../store/auth';
import { useAuthBootstrap } from '../hooks/use-auth-bootstrap';

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const { refetch, showRetry } = useAuthBootstrap();
  const status = useAuth((s) => s.status);
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-slate-500">
        <span>Cargando…</span>
        {showRetry ? (
          <button
            type="button"
            onClick={() => void refetch()}
            className="rounded border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
          >
            Reintentar
          </button>
        ) : null}
      </div>
    );
  }
  return <>{children}</>;
}