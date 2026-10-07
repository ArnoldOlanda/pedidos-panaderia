import { Link, NavLink, Outlet, useNavigate, type NavLinkRenderProps } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '../store/auth';
import { logoutRequest } from '../lib/auth';
import { PushToggle } from './push-toggle';

export function Layout() {
  const user = useAuth((s) => s.user);
  const clearAuth = useAuth((s) => s.clear);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logoutRequest();
    } catch {
      // Best-effort: even if the server call fails, drop the local session
      // so the UI reflects the intended logged-out state.
    }
    clearAuth();
    navigate('/catalog', { replace: true });
  };

  // NavLink sets aria-current="page" on the active link, so keyboard and
  // screen-reader users get the current page. The active item uses the full
  // foreground colour; the rest stay muted.
  const navLinkClassName = ({ isActive }: NavLinkRenderProps) =>
    cn('hover:underline', isActive ? 'font-medium text-foreground' : 'text-muted-foreground');

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-primary">Pedidos Panadería</Link>
        <nav className="flex gap-4 text-sm items-center">
          <NavLink to="/catalog" className={navLinkClassName}>Catálogo</NavLink>
          {user?.role === 'VENDEDOR' && (
            <>
              <NavLink to="/vendor/recipes" className={navLinkClassName}>Mis recetas</NavLink>
              <NavLink to="/vendor/ingredients" className={navLinkClassName}>Insumos</NavLink>
              <NavLink to="/vendor/products" className={navLinkClassName}>Mis productos</NavLink>
              <NavLink to="/vendor/orders" className={navLinkClassName}>Pedidos</NavLink>
            </>
          )}
          {!user && <NavLink to="/login" className={navLinkClassName}>Ingresar</NavLink>}
          {user?.role === 'VENDEDOR' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                void handleLogout();
              }}
              className="text-muted-foreground"
            >
              Salir
            </Button>
          )}
          {user && <PushToggle />}
        </nav>
      </header>
      <main className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-muted-foreground py-4">
        Pedidos Panadería · MVP
      </footer>
      <Toaster richColors closeButton position="top-right" />
    </div>
  );
}
