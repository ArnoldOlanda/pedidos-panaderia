import { Link, Outlet, useNavigate } from 'react-router-dom';
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-amber-600">Pedidos Panadería</Link>
        <nav className="flex gap-4 text-sm items-center">
          <Link to="/catalog" className="hover:underline">Catálogo</Link>
          {user?.role === 'VENDEDOR' && (
            <>
              <Link to="/vendor/recipes" className="hover:underline">Mis recetas</Link>
              <Link to="/vendor/ingredients" className="hover:underline">Insumos</Link>
              <Link to="/vendor/products" className="hover:underline">Mis productos</Link>
              <Link to="/vendor/orders" className="hover:underline">Pedidos</Link>
            </>
          )}
          {!user && <Link to="/login" className="hover:underline">Ingresar</Link>}
          {user?.role === 'VENDEDOR' && (
            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              className="rounded px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
            >
              Salir
            </button>
          )}
          {user && <PushToggle />}
        </nav>
      </header>
      <main className="flex-1 px-4 py-6 max-w-4xl mx-auto w-full">
        <Outlet />
      </main>
      <footer className="text-center text-xs text-slate-500 py-4">
        Pedidos Panadería · MVP
      </footer>
    </div>
  );
}