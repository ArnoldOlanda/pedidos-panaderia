import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useMyTodayProducts } from '../../hooks/use-my-today-products';
import { useOrdersByProduct } from '../../hooks/use-orders-by-product';
import { useUpdateOrderStatus } from '../../hooks/use-update-order-status';
import { toApiError } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import type { Order } from '../../lib/orders';
import type { Product } from '../../lib/products';

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

function OrderRow({
  order,
  productId,
}: {
  order: Order;
  productId: string;
}) {
  const updateStatus = useUpdateOrderStatus(productId);

  const isThisPending =
    updateStatus.isPending && updateStatus.variables?.orderId === order.id;
  const thisError =
    !updateStatus.isPending &&
    updateStatus.isError &&
    updateStatus.variables?.orderId === order.id
      ? toApiError(updateStatus.error)
      : null;

  const trigger = (status: 'LISTO' | 'ENTREGADO') => {
    updateStatus.mutate({ orderId: order.id, status });
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-900">
            {order.buyerName} {order.buyerApellidos}
          </h2>
          <p className="text-xs text-slate-500">DNI {order.buyerDni} · {order.buyerCarrera}</p>
          <p className="text-sm text-slate-600">
            × {order.quantity} {order.quantity === 1 ? 'unidad' : 'unidades'}
          </p>
          <p className="text-xs text-slate-500">{TIME_FORMAT.format(new Date(order.createdAt))}</p>
        </div>
        <div className="text-right space-y-2">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[order.status]}`}
          >
            {STATUS_LABEL[order.status]}
          </span>
          {isThisPending && (
            <p className="text-xs text-slate-500" aria-live="polite">
              Guardando…
            </p>
          )}
        </div>
      </div>

      {!isThisPending && !thisError && order.status === 'PENDIENTE' && (
        <button
          type="button"
          onClick={() => trigger('LISTO')}
          className="mt-3 rounded bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600"
        >
          Marcar LISTO
        </button>
      )}

      {!isThisPending && !thisError && order.status === 'LISTO' && (
        <button
          type="button"
          onClick={() => trigger('ENTREGADO')}
          className="mt-3 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
        >
          Marcar ENTREGADO
        </button>
      )}

      {thisError && (
        <div
          className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          <p>
            {thisError.status === 400
              ? thisError.message
              : 'No pudimos actualizar este pedido. Reintenta'}
          </p>
          <button
            type="button"
            onClick={() => {
              const next = order.status === 'PENDIENTE' ? 'LISTO' : 'ENTREGADO';
              trigger(next);
            }}
            className="mt-2 px-3 py-1 rounded bg-red-600 text-white text-sm hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      )}
    </article>
  );
}

function OrderSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-5 w-1/3 rounded bg-slate-200 animate-pulse" />
      <div className="mt-3 h-4 w-1/4 rounded bg-slate-200 animate-pulse" />
      <div className="mt-3 h-4 w-1/5 rounded bg-slate-200 animate-pulse" />
    </div>
  );
}

function OrderList({ productId }: { productId: string }) {
  const ordersQuery = useOrdersByProduct(productId);

  if (ordersQuery.isLoading) {
    return (
      <div className="space-y-3">
        <OrderSkeleton />
        <OrderSkeleton />
        <OrderSkeleton />
      </div>
    );
  }

  if (ordersQuery.isError) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm text-slate-700">
        <p>No pudimos cargar los pedidos</p>
        <button
          type="button"
          onClick={() => {
            void ordersQuery.refetch();
          }}
          className="mt-3 px-4 py-2 rounded bg-amber-500 text-white hover:bg-amber-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const orders = ordersQuery.data ?? [];
  if (orders.length === 0) {
    return <p className="text-sm text-slate-600">Nadie ha pedido este producto todavía.</p>;
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} productId={productId} />
      ))}
    </div>
  );
}

export function VendorOrdersPage() {
  const user = useAuth((s) => s.user);
  const isVendor = user?.role === 'VENDEDOR';
  const todayProducts = useMyTodayProducts();
  const [searchParams, setSearchParams] = useSearchParams();

  const urlProductId = searchParams.get('productId');
  const products = todayProducts.data ?? [];

  const selectedProductId = useMemo(() => {
    if (urlProductId && products.some((p) => p.id === urlProductId)) return urlProductId;
    return products[0]?.id ?? null;
  }, [urlProductId, products]);

  useEffect(() => {
    if (!selectedProductId) return;
    if (urlProductId === selectedProductId) return;
    setSearchParams({ productId: selectedProductId }, { replace: true });
  }, [selectedProductId, urlProductId, setSearchParams]);

  const handleProductChange = (id: string) => {
    setSearchParams({ productId: id });
  };

  if (user && !isVendor) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-3">
        <h1 className="text-2xl font-semibold text-slate-900">Pedidos recibidos</h1>
        <p className="text-sm text-slate-600">Esta sección es solo para vendedores.</p>
        <Link
          to="/orders"
          className="inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Ir a Mis pedidos →
        </Link>
      </section>
    );
  }

  const noProducts = !todayProducts.isLoading && !todayProducts.isError && products.length === 0;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Pedidos recibidos</h1>
        {user?.name && (
          <p className="text-sm text-slate-600">Estás gestionando pedidos como {user.name}</p>
        )}
      </header>

      {noProducts && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm text-slate-700 space-y-3">
          <p>Hoy no has publicado productos.</p>
          <Link
            to="/vendor/products"
            className="inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            Ve a Publicar producto para empezar →
          </Link>
        </div>
      )}

      {!noProducts && products.length > 0 && selectedProductId && (
        <>
          <label className="block text-sm">
            <span className="text-slate-700">Producto</span>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductChange(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
            >
              {products.map((p: Product) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {formatPrice(p.price)}
                </option>
              ))}
            </select>
          </label>

          <OrderList productId={selectedProductId} />
        </>
      )}
    </section>
  );
}