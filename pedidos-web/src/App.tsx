export function App(): JSX.Element {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <header className="px-6 py-5 border-b border-slate-200 bg-white">
        <h1 className="text-xl font-semibold tracking-tight">
          Pedidos Panadería
        </h1>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <section className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-600">
            Scaffold
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Pedidos Web v0.0.0
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Scaffold listo · Próximos pasos: 3.4 routing + estado, 3.5 login
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/api/health"
              target="_blank"
              rel="noopener"
              className="inline-flex items-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              ping backend
            </a>
            <span className="inline-flex items-center rounded-lg border border-slate-200 px-4 py-2 text-xs text-slate-500">
              Vite + React + TS + Tailwind
            </span>
          </div>
        </section>
      </main>
    </div>
  );
}