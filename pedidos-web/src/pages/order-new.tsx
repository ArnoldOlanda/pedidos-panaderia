import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useProduct } from '../hooks/use-product';
import { usePlaceOrder } from '../hooks/use-place-order';
import { toApiError } from '../lib/api';
import { closesInLabel, formatCloseTimeLima, formatPrice } from '../lib/format';

const MAX_QUANTITY = 10;

function NewOrderSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-3">
      <div className="h-7 w-2/3 rounded bg-slate-200 animate-pulse" />
      <div className="h-4 w-1/2 rounded bg-slate-200 animate-pulse" />
      <div className="h-10 w-full rounded bg-slate-200 animate-pulse" />
      <div className="h-10 w-32 rounded bg-slate-200 animate-pulse" />
    </div>
  );
}

export function OrderNewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const productId = searchParams.get('productId') ?? undefined;
  const { data, isLoading, isError, error, refetch } = useProduct(productId);
  const productError = isError ? toApiError(error) : null;
  const isNotFound = productError?.status === 404;

  const [quantity, setQuantity] = useState(1);
  const [orderError, setOrderError] = useState<{ status: number; message: string } | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  const placeOrder = usePlaceOrder();
  const pending = placeOrder.isPending;

  // Auto-fade the success flash after 3s
  useEffect(() => {
    if (!flashMessage) return;
    const timer = setTimeout(() => setFlashMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [flashMessage]);

  const productIsClosed = Boolean(data?.closed) || (data ? new Date(data.closesAt).getTime() <= Date.now() : false);

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    if (!data) return;
    setOrderError(null);
    placeOrder.mutate(
      { productId: data.id, quantity },
      {
        onSuccess: () => {
          setFlashMessage('Pedido confirmado');
          setTimeout(() => navigate('/orders?just=1'), 3000);
        },
        onError: (err) => {
          const apiErr = toApiError(err);
          setOrderError(apiErr);
        },
      },
    );
  };

  return (
    <section className="space-y-4">
      <Link to="/catalog" className="text-sm text-amber-600 hover:text-amber-700">
        ← Catálogo
      </Link>

      {flashMessage && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="status"
        >
          {flashMessage}
        </div>
      )}

      {isLoading && <NewOrderSkeleton />}

      {!isLoading && isNotFound && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm text-slate-700">
          <p>No encontramos este producto</p>
          <Link
            to="/catalog"
            className="mt-3 inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            Volver al catálogo
          </Link>
        </div>
      )}

      {!isLoading && isError && !isNotFound && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm text-slate-700">
          <p>No pudimos cargar este producto</p>
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

      {!isLoading && !isError && data && productIsClosed && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-3 text-slate-700">
          <h1 className="text-2xl font-semibold text-slate-900">{data.name}</h1>
          <p className="text-sm">Este producto ya no acepta pedidos.</p>
          <Link
            to="/catalog"
            className="inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
          >
            Volver al catálogo
          </Link>
        </div>
      )}

      {!isLoading && !isError && data && !productIsClosed && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-4"
        >
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">{data.name}</h1>
            <p className="text-sm text-slate-600">
              {formatPrice(data.price)} · Cierra a las {formatCloseTimeLima(data.closesAt)} ·{' '}
              {closesInLabel(data.closesAt, data.closed)}
            </p>
          </header>

          <label className="block text-sm">
            <span className="text-slate-700">Cantidad</span>
            <input
              type="number"
              min={1}
              max={MAX_QUANTITY}
              required
              value={quantity}
              onChange={(e) => {
                const raw = Number.parseInt(e.target.value, 10);
                if (Number.isNaN(raw)) {
                  setQuantity(1);
                  return;
                }
                setQuantity(Math.min(MAX_QUANTITY, Math.max(1, raw)));
              }}
              className="mt-1 w-32 rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
            />
            <span className="ml-2 text-xs text-slate-500">máx. {MAX_QUANTITY}</span>
          </label>

          <p className="text-sm text-slate-700">
            Total: <span className="font-semibold">{formatPrice(data.price * quantity)}</span>
          </p>

          {orderError?.status === 403 && (
            <div
              className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
              role="alert"
            >
              <p>Solo los compradores pueden hacer pedidos.</p>
              <Link
                to="/catalog"
                className="mt-2 inline-block text-sm font-medium text-amber-700 hover:text-amber-800"
              >
                Volver al catálogo
              </Link>
            </div>
          )}

          {orderError && orderError.status !== 403 && (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              <p>{orderError.message || 'No pudimos registrar el pedido'}</p>
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="mt-2 px-3 py-1 rounded bg-amber-500 text-white text-sm hover:bg-amber-600"
              >
                Reintentar
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Procesando…' : 'Confirmar pedido'}
          </button>
        </form>
      )}
    </section>
  );
}