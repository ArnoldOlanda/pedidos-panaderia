import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useMyTodayProducts } from '../../hooks/use-my-today-products';
import { useRecipes } from '../../hooks/use-recipes';
import { usePublishProduct } from '../../hooks/use-publish-product';
import type { PublishProductInput } from '../../hooks/use-publish-product';
import { toApiError } from '../../lib/api';
import { closesInLabel, formatCloseTimeLima, formatPrice } from '../../lib/format';
import type { Product } from '../../lib/products';
import type { Recipe } from '../../lib/recipes';

function limaParts(date: Date): { ymd: string; hm: string; ymdhm: string } {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  const parts = f.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const year = parts.year ?? '0000';
  const month = parts.month ?? '01';
  const day = parts.day ?? '01';
  const hour = parts.hour ?? '00';
  const minute = parts.minute ?? '00';
  const ymd = `${year}-${month}-${day}`;
  const hm = `${hour}:${minute}`;
  return { ymd, hm, ymdhm: `${ymd}T${hm}` };
}

function defaultAvailableDate(): string {
  return limaParts(new Date()).ymd;
}

function defaultClosesAt(): string {
  return limaParts(new Date(Date.now() + 6 * 60 * 60 * 1000)).ymdhm;
}

function parseYmd(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!match) return null;
  const [, y, m, d] = match;
  const parsed = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function MyProductCard({ product }: { product: Product }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-medium text-slate-900">{product.name}</h2>
          <p className="text-sm text-slate-600">
            Cierra a las {formatCloseTimeLima(product.closesAt)} ·{' '}
            {closesInLabel(product.closesAt, product.closed)}
          </p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-amber-600 font-medium">{formatPrice(product.price)}</p>
          {product.closed && (
            <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              cerrado
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function MyProductSkeleton() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="h-5 w-2/3 rounded bg-slate-200 animate-pulse" />
      <div className="mt-3 h-4 w-1/2 rounded bg-slate-200 animate-pulse" />
    </div>
  );
}

export function VendorProductsPage() {
  const user = useAuth((s) => s.user);
  const isVendor = user?.role === 'VENDEDOR';

  const todayProducts = useMyTodayProducts();
  const recipesQuery = useRecipes();
  const publish = usePublishProduct();

  const [recipeId, setRecipeId] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [availableDate, setAvailableDate] = useState(defaultAvailableDate);
  const [closesAtLocal, setClosesAtLocal] = useState(defaultClosesAt);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!flashMessage) return;
    const timer = setTimeout(() => setFlashMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [flashMessage]);

  const selectedRecipe: Recipe | undefined = useMemo(
    () => recipesQuery.data?.find((r) => r.id === recipeId),
    [recipesQuery.data, recipeId],
  );

  const sortedToday = useMemo(() => {
    if (!todayProducts.data) return [];
    return [...todayProducts.data].sort((a, b) => a.closesAt.localeCompare(b.closesAt));
  }, [todayProducts.data]);

  const resetForm = () => {
    setRecipeId('');
    setName('');
    setPrice('');
    setAvailableDate(defaultAvailableDate());
    setClosesAtLocal(defaultClosesAt());
  };

  const validate = (): string | null => {
    if (!recipeId.trim()) return 'Selecciona una receta';
    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 200) {
      return 'El nombre debe tener entre 1 y 200 caracteres';
    }
    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      return 'El precio debe ser mayor a 0';
    }
    const dateParsed = parseYmd(availableDate);
    if (!dateParsed) return 'La fecha disponible no es válida';
    const todayYmd = defaultAvailableDate();
    if (availableDate < todayYmd) {
      return 'La fecha disponible debe ser hoy o posterior';
    }
    if (!closesAtLocal) return 'Define la hora de cierre';
    const closesAtDate = new Date(closesAtLocal);
    if (Number.isNaN(closesAtDate.getTime())) {
      return 'La hora de cierre no es válida';
    }
    if (closesAtDate.getTime() <= Date.now()) {
      return 'La hora de cierre debe estar en el futuro';
    }
    return null;
  };

  const handleSubmit = (event?: FormEvent<HTMLFormElement>) => {
    if (event) event.preventDefault();
    setServerError(null);
    setValidationError(null);

    const v = validate();
    if (v) {
      setValidationError(v);
      return;
    }

    const input: PublishProductInput = {
      recipeId,
      name: name.trim(),
      price: Number(price),
      availableDate,
      closesAt: new Date(closesAtLocal).toISOString(),
    };

    publish.mutate(input, {
      onSuccess: () => {
        setFlashMessage('Producto publicado');
        resetForm();
      },
      onError: (err) => {
        const apiErr = toApiError(err);
        if (apiErr.status === 404) {
          setRecipeId('');
        }
        setServerError(apiErr.message || 'No pudimos publicar el producto');
      },
    });
  };

  if (user && !isVendor) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm space-y-3">
        <h1 className="text-2xl font-semibold text-slate-900">Publicar producto</h1>
        <p className="text-sm text-slate-600">Esta sección es solo para vendedores.</p>
        <Link
          to="/catalog"
          className="inline-block text-sm font-medium text-amber-600 hover:text-amber-700"
        >
          Volver al catálogo →
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Publicar producto</h1>
        {user?.name && (
          <p className="text-sm text-slate-600">Estás publicando como {user.name}</p>
        )}
      </header>

      {flashMessage && (
        <div
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
          role="status"
        >
          {flashMessage}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Tus productos de hoy</h2>

        {todayProducts.isLoading && (
          <div className="space-y-3">
            <MyProductSkeleton />
            <MyProductSkeleton />
          </div>
        )}

        {!todayProducts.isLoading && todayProducts.isError && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm text-slate-700">
            <p>No pudimos cargar tus productos</p>
            <button
              type="button"
              onClick={() => {
                void todayProducts.refetch();
              }}
              className="mt-3 px-4 py-2 rounded bg-amber-500 text-white hover:bg-amber-600"
            >
              Reintentar
            </button>
          </div>
        )}

        {!todayProducts.isLoading && !todayProducts.isError && sortedToday.length === 0 && (
          <p className="text-sm text-slate-600">Hoy no has publicado productos.</p>
        )}

        {!todayProducts.isLoading && !todayProducts.isError && sortedToday.length > 0 && (
          <div className="space-y-3">
            {sortedToday.map((product) => (
              <MyProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Publicar nuevo producto</h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-slate-700">Receta</span>
            <select
              value={recipeId}
              onChange={(e) => setRecipeId(e.target.value)}
              required
              className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
            >
              <option value="">Selecciona una receta</option>
              {recipesQuery.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · sugerido {formatPrice(r.suggestedPrice)}
                </option>
              ))}
            </select>
            <Link
              to="/vendor/recipes"
              className="mt-1 inline-block text-xs font-medium text-amber-600 hover:text-amber-700"
            >
              Gestionar recetas →
            </Link>
          </label>

          <label className="block text-sm">
            <span className="text-slate-700">Nombre del producto</span>
            <input
              type="text"
              maxLength={200}
              minLength={1}
              placeholder="Pan de yema (docena)"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-700">
              Precio{' '}
              {selectedRecipe && (
                <span className="text-xs text-slate-500">
                  Sugerido: {formatPrice(selectedRecipe.suggestedPrice)}
                </span>
              )}
            </span>
            <input
              type="number"
              step="0.10"
              min="0.01"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-32 rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-700">Fecha disponible</span>
            <input
              type="date"
              required
              value={availableDate}
              onChange={(e) => setAvailableDate(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-700">Hora de cierre</span>
            <input
              type="datetime-local"
              required
              value={closesAtLocal}
              onChange={(e) => setClosesAtLocal(e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none"
            />
          </label>

          {validationError && (
            <p className="text-sm text-red-600" role="alert">
              {validationError}
            </p>
          )}

          {serverError && publish.error && (() => {
            const status = toApiError(publish.error).status;
            if (status === 403) {
              return (
                <div
                  className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                  role="alert"
                >
                  <p>Solo los vendedores pueden publicar productos.</p>
                  <Link
                    to="/catalog"
                    className="mt-2 inline-block text-sm font-medium text-amber-700 hover:text-amber-800"
                  >
                    Volver al catálogo →
                  </Link>
                </div>
              );
            }
            if (status === 404) {
              return (
                <p className="text-sm text-red-600" role="alert">
                  La receta seleccionada ya no existe.
                </p>
              );
            }
            if (status === 409) {
              return (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  <p>{serverError}</p>
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    className="mt-2 px-3 py-1 rounded bg-amber-500 text-white text-sm hover:bg-amber-600"
                  >
                    Reintentar
                  </button>
                </div>
              );
            }
            return (
              <p className="text-sm text-red-600" role="alert">
                {serverError}
              </p>
            );
          })()}

          <button
            type="submit"
            disabled={publish.isPending}
            className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {publish.isPending ? 'Publicando…' : 'Publicar producto'}
          </button>
        </form>
      </section>
    </section>
  );
}