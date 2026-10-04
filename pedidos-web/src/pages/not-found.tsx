import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs text-center">
      <h1 className="text-2xl font-semibold text-slate-900">404 — no encontramos esa página</h1>
      <p className="mt-2 text-sm text-slate-600">
        Volver al{' '}
        <Link to="/" className="text-amber-600 hover:underline">
          inicio
        </Link>
        .
      </p>
    </section>
  );
}