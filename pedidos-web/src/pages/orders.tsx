import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMyOrders } from '../hooks/use-my-orders';
import { useAuth } from '../store/auth';
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
  const { data, isLoading, isError, refetch } = useMyOrders();
  const user = useAuth((s) => s.user);
  const [searchParams] = useSearchParams();
  const justCreated = searchParams.get('just') === '1';
  const [flashMessage, setFlashMessage] = useState<string | null>(
    justCreated ? 'Pedido confirmado' : null,
  );

  useEffect(() => {
    if (!flashMessage) return;
    const timer = setTimeout(() => setFlashMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [flashMessage]);

  if (user?.role === 'VENDEDOR') {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-3">
        <h1 className="text-2xl font-semibold text-slate-900">Mis pedidos</h1>
        <p className="text-sm text-slate-600">
          Esta vista es para compradores. Como vendedor, ve a Pedidos.
        </p>
        <Link
          to="/vendor/orders"
          className="inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Ir a Pedidos (vendedor) →
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Mis pedidos</h1>

      {flashMessage && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="status"
        >
          {flashMessage}
        </div>
      )}

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

      {!isLoading && !isError && data && data.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm text-slate-600 space-y-3">
          <p>Todavía no tienes pedidos.</p>
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