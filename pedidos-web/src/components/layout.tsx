import { useEffect, useRef, useState } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  type NavLinkRenderProps,
} from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '../store/auth';
import { logoutRequest } from '../lib/auth';
import { PushToggle, PushBrowserHint } from './push-toggle';

// The aside and the toggler share this id so the toggler's
// `aria-controls` always points at a real element, even when the
// sidebar is rendered off-screen on mobile.
const SIDEBAR_ID = 'primary-sidebar';

export function Layout() {
  const user = useAuth((s) => s.user);
  const clearAuth = useAuth((s) => s.clear);
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const togglerRef = useRef<HTMLButtonElement>(null);
  const asideRef = useRef<HTMLElement>(null);

  // The drawer closes whenever the route changes: `NavLink` is the only
  // way to navigate in the SPA, so the pathname change is the canonical
  // event to sync the drawer state with.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Escape closes the drawer. Without it, the keyboard / screen-reader
  // user has no way to dismiss the modal-style aside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Focus + body scroll lock. On open: move focus to the first nav link
  // and freeze the body so the page underneath does not scroll while the
  // modal is up. On close: return focus to the toggler.
  useEffect(() => {
    if (open) {
      const firstLink =
        asideRef.current?.querySelector<HTMLAnchorElement>('a[href]');
      firstLink?.focus();
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
    togglerRef.current?.focus();
  }, [open]);

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
    cn(
      'py-2 px-4 rounded-xl transition-colors hover:bg-primary/10',
      isActive
        ? 'font-medium text-foreground bg-primary/30'
        : 'text-muted-foreground',
    );

  return (
    <div className="h-screen max-h-screen flex flex-col bg-background text-foreground">
      <header className="bg-card border-b border-border px-4 py-3 h-13 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            ref={togglerRef}
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-expanded={open}
            aria-controls={SIDEBAR_ID}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => {
              setOpen((v) => !v);
            }}
          >
            {open ? (
              <X aria-hidden="true" />
            ) : (
              <Menu aria-hidden="true" />
            )}
          </Button>
          <Link to="/" className="font-semibold text-primary">
            Pedidos Panadería
          </Link>
        </div>
        <nav className="flex gap-4 text-sm items-center">
          {/* <NavLink to="/catalog" className={navLinkClassName}>Catálogo</NavLink> */}
          {/* {user?.role === 'VENDEDOR' && (
            <>
              <NavLink to="/vendor/recipes" className={navLinkClassName}>Mis recetas</NavLink>
              <NavLink to="/vendor/ingredients" className={navLinkClassName}>Insumos</NavLink>
              <NavLink to="/vendor/products" className={navLinkClassName}>Mis productos</NavLink>
              <NavLink to="/vendor/orders" className={navLinkClassName}>Pedidos</NavLink>
            </>
          )} */}
          {!user && (
            <NavLink to="/login" className={navLinkClassName}>
              Ingresar
            </NavLink>
          )}
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
              <LogOut aria-hidden="true" />
              Salir
            </Button>
          )}
          {<PushToggle />}
        </nav>
      </header>

      {/*
        Backdrop is a real <button> (not a <div>) so keyboard users can
        focus and activate it. Always rendered so `transition-opacity`
        runs both ways; `pointer-events-none` keeps it inert when closed,
        and `lg:hidden` removes it on desktop where the sidebar is
        persistent and there is nothing to dismiss.
      */}
      <button
        type="button"
        aria-label="Cerrar menú"
        tabIndex={open ? 0 : -1}
        onClick={() => {
          setOpen(false);
        }}
        className={cn(
          'fixed inset-0 z-30 bg-black/40 transition-opacity duration-200',
          'lg:hidden',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        )}
      />

      <div className="flex h-[calc(100vh-52px-45px)]">
        <aside
          ref={asideRef}
          id={SIDEBAR_ID}
          data-state={open ? 'open' : 'closed'}
          aria-label="Navegación principal"
          aria-modal={open ? true : undefined}
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-72 bg-card border-r border-border p-4 flex flex-col',
            'transition-transform duration-200 ease-in-out',
            'lg:static lg:z-auto',
            open ? 'translate-x-0' : '-translate-x-full',
            'lg:translate-x-0',
          )}
        >
          <NavLink to="/catalog" className={navLinkClassName}>
            Catálogo
          </NavLink>
          {user?.role === 'VENDEDOR' && (
            <>
              <NavLink to="/vendor/recipes" className={navLinkClassName}>
                Mis recetas
              </NavLink>
              <NavLink to="/vendor/ingredients" className={navLinkClassName}>
                Insumos
              </NavLink>
              <NavLink to="/vendor/products" className={navLinkClassName}>
                Mis productos
              </NavLink>
              <NavLink to="/vendor/orders" className={navLinkClassName}>
                Pedidos
              </NavLink>
            </>
          )}
        </aside>
        <main className="flex-1 px-4 sm:px-8 md:px-24 lg:px-72 py-6 mx-auto w-full max-h-screen overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <footer className="flex flex-col items-center h-11.25 gap-2 py-4 text-xs text-muted-foreground">
        <PushBrowserHint />
        <div>Pedidos Panadería · MVP</div>
      </footer>
      <Toaster richColors closeButton position="top-center" />
    </div>
  );
}
