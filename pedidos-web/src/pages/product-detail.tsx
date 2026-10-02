import { Link, useParams } from 'react-router-dom';
import { useProduct } from '../hooks/use-product';
import { closesInLabel, formatCloseTimeLima, formatPrice } from '../lib/format';
import { toApiError } from '../lib/api';

function DetailSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-3">
      <div className="h-7 w-2/3 rounded bg-slate-200 animate-pulse" />
      <div className="h-6 w-1/3 rounded bg-slate-200 animate-pulse" />
      <div className="h-4 w-1/2 rounded bg-slate-200 animate-pulse" />
      <div className="h-4 w-1/3 rounded bg-slate-200 animate-pulse" />
      <div className="h-10 w-32 rounded bg-slate-200 animate-pulse" />
    </div>
  );
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useProduct(id);
  const apiError = isError ? toApiError(error) : null;
  const isNotFound = apiError?.status === 404;

  return (
    <section className="space-y-4">
      <Link to="/catalog" className="text-sm text-amber-600 hover:text-amber-700">
        ← Catálogo
      </Link>

      {isLoading && <DetailSkeleton />}

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

      {!isLoading && !isError && data && (
        <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm space-y-3">
          <h1 className="text-3xl font-semibold text-slate-900">{data.name}</h1>
          <p className="text-2xl text-amber-600">{formatPrice(data.price)}</p>
          <p className="text-sm text-slate-700">
            Cierra a las {formatCloseTimeLima(data.closesAt)} ·{' '}
            {closesInLabel(data.closesAt, data.closed)}
          </p>
          <p className="text-sm text-slate-500">
            Disponible: {data.availableDate.slice(0, 10)}
          </p>
          <Link
            to={`/orders/new?productId=${data.id}`}
            className="inline-block bg-amber-500 text-white px-4 py-2 rounded hover:bg-amber-600"
          >
            Pedir
          </Link>
        </article>
      )}
    </section>
  );
}