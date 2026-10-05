import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../store/auth';
import { useAuthBootstrap } from '../hooks/use-auth-bootstrap';

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const { isLoading, infrastructureError, refetch } = useAuthBootstrap();
  const status = useAuth((s) => s.status);
  if (infrastructureError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-foreground gap-3 p-6">
        <p className="text-lg">No pudimos contactar al servidor.</p>
        <Button
          type="button"
          variant="default"
          onClick={() => {
            void refetch();
          }}
        >
          Reintentar
        </Button>
        <p className="text-xs text-muted-foreground">Si el problema persiste, vuelve más tarde.</p>
      </div>
    );
  }
  if (status === 'idle' || isLoading) {
    // A live region has to pre-exist and announce its own content change. This
    // component early-returns a different root per state, so there is no stable
    // parent to hold the region: the loading root itself is the region.
    return (
      <div
        role="status"
        className="min-h-screen flex items-center justify-center text-muted-foreground"
      >
        Cargando…
      </div>
    );
  }
  return <>{children}</>;
}
