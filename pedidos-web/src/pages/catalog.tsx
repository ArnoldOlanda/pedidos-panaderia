import { Link } from 'react-router-dom';
import { useTodayProducts } from '../hooks/use-today-products';
import { closesInLabel, formatCloseTimeLima, formatPrice } from '../lib/format';
import type { Product } from '../lib/products';

function ProductCard({ product }: { product: Product }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <h2 className="text-lg font-semibold text-slate-900">{product.name}</h2>
      <p className="mt-1 text-amber-600 font-medium">{formatPrice(product.price)}</p>
      <p className="mt-2 text-sm text-slate-600">
        Cierra a las {formatCloseTimeLima(product.closesAt)} ·{' '}
        {closesInLabel(product.closesAt, product.closed)}
      </p>
      <Link
        to={`/catalog/${product.id}`}
        className="mt-3 inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
      >
        Ver detalle
      </Link>
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
      <div className="h-5 w-2/3 rounded-sm bg-slate-200 animate-pulse" />
      <div className="mt-3 h-4 w-1/3 rounded-sm bg-slate-200 animate-pulse" />
      <div className="mt-3 h-4 w-3/4 rounded-sm bg-slate-200 animate-pulse" />
    </div>
  );
}

export function CatalogPage() {
  const { data, isLoading, isError, refetch } = useTodayProducts();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Catálogo diario</h1>

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!isLoading && isError && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs text-slate-700">
          <p>No pudimos cargar el catálogo</p>
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

      {!isLoading && !isError && data && data.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-xs text-slate-600">
          <p>Hoy no hay productos publicados</p>
        </div>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}