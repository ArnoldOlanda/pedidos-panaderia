import { ReactNode } from 'react';
import { useAuth } from '../store/auth';
import { useAuthBootstrap } from '../hooks/use-auth-bootstrap';

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const { isLoading, infrastructureError, refetch } = useAuthBootstrap();
  const status = useAuth((s) => s.status);
  if (infrastructureError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-slate-700 gap-3 p-6">
        <p className="text-lg">No pudimos contactar al servidor.</p>
        <button
          type="button"
          onClick={() => {
            void refetch();
          }}
          className="px-4 py-2 rounded bg-amber-500 text-white hover:bg-amber-600"
        >
          Reintentar
        </button>
        <p className="text-xs text-slate-500">Si el problema persiste, vuelve más tarde.</p>
      </div>
    );
  }
  if (status === 'idle' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-500">
        Cargando…
      </div>
    );
  }
  return <>{children}</>;
}
