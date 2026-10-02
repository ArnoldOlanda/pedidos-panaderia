import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { PushToggle } from './push-toggle';

export function Layout() {
  const user = useAuth((s) => s.user);
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="font-semibold text-amber-600">Pedidos Panadería</Link>
        <nav className="flex gap-4 text-sm items-center">
          <Link to="/catalog" className="hover:underline">Catálogo</Link>
          {user?.role === 'COMPRADOR' && (
            <Link to="/orders" className="hover:underline">Mis pedidos</Link>
          )}
          {user?.role === 'VENDEDOR' && (
            <>
              <Link to="/vendor/products" className="hover:underline">Mis productos</Link>
              <Link to="/vendor/orders" className="hover:underline">Pedidos</Link>
            </>
          )}
          {!user && <Link to="/login" className="hover:underline">Ingresar</Link>}
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