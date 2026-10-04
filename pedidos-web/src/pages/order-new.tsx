import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useProduct } from '../hooks/use-product';
import { usePlaceOrder } from '../hooks/use-place-order';
import { toApiError } from '../lib/api';
import { getOrCreateDeviceId } from '../lib/device';
import { closesInLabel, formatCloseTimeLima, formatPrice } from '../lib/format';

const MAX_QUANTITY = 10;
const MAX_NAME_LENGTH = 120;
const DNI_PATTERN = /^\d{8}$/;
const LAST_DNI_KEY = 'buyer:last-dni';

interface BuyerInfo {
  buyerDni: string;
  buyerName: string;
  buyerApellidos: string;
  buyerCarrera: string;
}

function NewOrderSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs space-y-3">
      <div className="h-7 w-2/3 rounded-sm bg-slate-200 animate-pulse" />
      <div className="h-4 w-1/2 rounded-sm bg-slate-200 animate-pulse" />
      <div className="h-10 w-full rounded-sm bg-slate-200 animate-pulse" />
      <div className="h-10 w-32 rounded-sm bg-slate-200 animate-pulse" />
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
  const [buyer, setBuyer] = useState<BuyerInfo>(() => {
    let initialDni = '';
    if (typeof localStorage !== 'undefined') {
      initialDni = localStorage.getItem(LAST_DNI_KEY) ?? '';
    }
    return { buyerDni: initialDni, buyerName: '', buyerApellidos: '', buyerCarrera: '' };
  });
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

  const buyerValid =
    DNI_PATTERN.test(buyer.buyerDni) &&
    buyer.buyerName.trim().length > 0 &&
    buyer.buyerApellidos.trim().length > 0 &&
    buyer.buyerCarrera.trim().length > 0;

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    if (!data) return;
    if (!buyerValid) {
      setOrderError({ status: 400, message: 'Completa todos los datos del comprador' });
      return;
    }
    setOrderError(null);
    placeOrder.mutate(
      {
        productId: data.id,
        quantity,
        buyerDni: buyer.buyerDni,
        buyerName: buyer.buyerName.trim(),
        buyerApellidos: buyer.buyerApellidos.trim(),
        buyerCarrera: buyer.buyerCarrera.trim(),
        buyerDeviceId: getOrCreateDeviceId(),
      },
      {
        onSuccess: () => {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem(LAST_DNI_KEY, buyer.buyerDni);
          }
          setFlashMessage('Pedido confirmado');
          setTimeout(() => navigate(`/orders?dni=${encodeURIComponent(buyer.buyerDni)}`), 1500);
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
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs text-slate-700">
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
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs text-slate-700">
          <p>No pudimos cargar este producto</p>
          <button
            type="button"
            onClick={() => {
              void refetch();
            }}
            className="mt-3 px-4 py-2 rounded-sm bg-amber-500 text-white hover:bg-amber-600"
          >
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !isError && data && productIsClosed && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs space-y-3 text-slate-700">
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
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs space-y-4"
        >
          <header className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">{data.name}</h1>
            <p className="text-sm text-slate-600">
              {formatPrice(data.price)} · Cierra a las {formatCloseTimeLima(data.closesAt)} ·{' '}
              {closesInLabel(data.closesAt, data.closed)}
            </p>
          </header>

          <fieldset className="space-y-3 border-t border-slate-100 pt-4">
            <legend className="text-sm font-medium text-slate-700">Datos del comprador</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-slate-700">DNI</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{8}"
                  maxLength={8}
                  required
                  value={buyer.buyerDni}
                  onChange={(e) => setBuyer({ ...buyer, buyerDni: e.target.value.replace(/\D/g, '') })}
                  className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-700">Carrera / especialidad</span>
                <input
                  type="text"
                  maxLength={MAX_NAME_LENGTH}
                  required
                  value={buyer.buyerCarrera}
                  onChange={(e) => setBuyer({ ...buyer, buyerCarrera: e.target.value })}
                  className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-700">Nombre</span>
                <input
                  type="text"
                  maxLength={MAX_NAME_LENGTH}
                  required
                  value={buyer.buyerName}
                  onChange={(e) => setBuyer({ ...buyer, buyerName: e.target.value })}
                  className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </label>
              <label className="block text-sm">
                <span className="text-slate-700">Apellidos</span>
                <input
                  type="text"
                  maxLength={MAX_NAME_LENGTH}
                  required
                  value={buyer.buyerApellidos}
                  onChange={(e) => setBuyer({ ...buyer, buyerApellidos: e.target.value })}
                  className="mt-1 w-full rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </label>
            </div>
          </fieldset>

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
              className="mt-1 w-32 rounded-sm border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
            <span className="ml-2 text-xs text-slate-500">máx. {MAX_QUANTITY}</span>
          </label>

          <p className="text-sm text-slate-700">
            Total: <span className="font-semibold">{formatPrice(data.price * quantity)}</span>
          </p>

          {orderError && (
            <div className="rounded-sm border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              <p>{orderError.message || 'No pudimos registrar el pedido'}</p>
              <button
                type="button"
                onClick={() => handleSubmit()}
                className="mt-2 px-3 py-1 rounded-sm bg-amber-500 text-white text-sm hover:bg-amber-600"
              >
                Reintentar
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={pending || !buyerValid}
            className="rounded-sm bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? 'Procesando…' : 'Confirmar pedido'}
          </button>
        </form>
      )}
    </section>
  );
}