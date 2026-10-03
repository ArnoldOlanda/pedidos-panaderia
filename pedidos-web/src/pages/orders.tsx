import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useOrdersByDni } from '../hooks/use-orders-by-dni';
import { formatPrice } from '../lib/format';
import type { Order } from '../lib/orders';

const TIME_FORMAT = new Intl.DateTimeFormat('es-PE', {
  timeStyle: 'short',
  dateStyle: 'short',
  timeZone: 'America/Lima',
});

const STATUS_LABEL: Record<Order['status'], string> = {
  PENDIENTE: 'Pendiente',
  LISTO: 'Listo',
  ENTREGADO: 'Entregado',
};

const STATUS_CLASSES: Record<Order['status'], string> = {
  PENDIENTE: 'bg-amber-100 text-amber-800',
  LISTO: 'bg-green-100 text-green-800',
  ENTREGADO: 'bg-slate-100 text-slate-600',
};

const LAST_DNI_KEY = 'buyer:last-dni';
const DNI_PATTERN = /^\d{8}$/;

function OrderCard({ order }: { order: Order }) {
  const total = order.product.price * order.quantity;
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">
            {order.product.name} × {order.quantity}
          </h2>
          <p className="text-xs text-slate-500">
            {TIME_FORMAT.format(new Date(order.createdAt))}
          </p>
        </div>
        <div className="text-right space-y-1">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[order.status]}`}
          >
            {STATUS_LABEL[order.status]}
          </span>
          <p className="text-sm font-medium text-slate-700">{formatPrice(total)}</p>
        </div>
      </div>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-5 w-2/3 rounded bg-slate-200 animate-pulse" />
      <div className="mt-3 h-4 w-1/3 rounded bg-slate-200 animate-pulse" />
      <div className="mt-3 h-4 w-1/4 rounded bg-slate-200 animate-pulse" />
    </div>
  );
}

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDni = searchParams.get('dni') ?? '';
  const [dni, setDni] = useState(initialDni);
  const [submittedDni, setSubmittedDni] = useState(initialDni);

  useEffect(() => {
    if (dni) return;
    if (typeof localStorage === 'undefined') return;
    const stored = localStorage.getItem(LAST_DNI_KEY);
    if (stored) setDni(stored);
  }, [dni]);

  const query = useOrdersByDni(submittedDni);
  const { data, isLoading, isError, refetch } = query;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = dni.trim();
    if (!DNI_PATTERN.test(trimmed)) return;
    setSubmittedDni(trimmed);
    setSearchParams({ dni: trimmed }, { replace: true });
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Mis pedidos</h1>

      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3"
      >
        <label className="block text-sm">
          <span className="text-slate-700">DNI</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{8}"
            maxLength={8}
            required
            value={dni}
            onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={!DNI_PATTERN.test(dni)}
          className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Buscar pedidos
        </button>
      </form>

      <p className="text-xs text-slate-500">
        Vendedores: ver pedidos recibidos{' '}
        <Link to="/vendor/orders" className="text-amber-600 hover:text-amber-700">
          aquí
        </Link>
        .
      </p>

      {isLoading && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!isLoading && isError && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm text-slate-700">
          <p>No pudimos cargar tus pedidos</p>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="mt-3 px-4 py-2 rounded bg-amber-500 text-white hover:bg-amber-600"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !isError && submittedDni && data && data.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm text-slate-600 space-y-3">
          <p>No encontramos pedidos para este DNI.</p>
          <Link
            to="/catalog"
            className="inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            Ver catálogo →
          </Link>
        </div>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="space-y-3">
          {data.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </section>
  );
}