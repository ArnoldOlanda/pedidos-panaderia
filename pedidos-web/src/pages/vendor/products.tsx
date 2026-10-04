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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const LOADING_LABEL = 'Cargando productos';

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
    <article>
      <Card>
        <CardContent>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              {/* A real h2, not CardTitle: CardTitle renders a div, which would leave the card without a heading element. */}
              <h2 className="font-heading text-lg font-semibold">{product.name}</h2>
              <p className="text-sm text-muted-foreground">
                Cierra a las {formatCloseTimeLima(product.closesAt)} ·{' '}
                {closesInLabel(product.closesAt, product.closed)}
              </p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-primary font-medium">{formatPrice(product.price)}</p>
              {product.closed && <Badge variant="secondary">cerrado</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}

function MyProductSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </CardContent>
    </Card>
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

  // Picking a recipe prefills the price with its suggested price, so the common
  // case (sell at the suggested price) is one click; the field stays editable.
  // This runs only on an explicit selection: doing it in an effect keyed on the
  // selected recipe would overwrite whatever the vendor typed every time the
  // recipes query refetches. Clearing the selection clears the price with it.
  const handleRecipeChange = (nextRecipeId: string) => {
    setRecipeId(nextRecipeId);
    const recipe = recipesQuery.data?.find((r) => r.id === nextRecipeId);
    setPrice(recipe ? recipe.suggestedPrice.toFixed(2) : '');
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
      <Card className="text-muted-foreground">
        <CardContent className="space-y-3">
          {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
          <h1 className="font-heading text-2xl font-semibold text-foreground">Publicar producto</h1>
          <p className="text-sm">Esta sección es solo para vendedores.</p>
          <Link
            to="/catalog"
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            Volver al catálogo →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
        <h1 className="font-heading text-2xl font-semibold">Publicar producto</h1>
        {user?.name && (
          <p className="text-sm text-muted-foreground">Estás publicando como {user.name}</p>
        )}
      </header>

      {flashMessage && (
        <div
          role="status"
          className="rounded-lg bg-success px-4 py-3 text-sm text-success-foreground"
        >
          {flashMessage}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Tus productos de hoy</h2>

        {/* role=status rather than aria-live on the skeleton: a live region has to
            pre-exist and announce its own content change, not the decorative bars. */}
        <span role="status" className="sr-only">
          {todayProducts.isLoading ? LOADING_LABEL : ''}
        </span>

        {todayProducts.isLoading && (
          <div aria-hidden="true" className="space-y-3">
            <MyProductSkeleton />
            <MyProductSkeleton />
          </div>
        )}

        {!todayProducts.isLoading && todayProducts.isError && (
          <Alert variant="destructive">
            <AlertTitle>No pudimos cargar tus productos</AlertTitle>
            <AlertDescription>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  void todayProducts.refetch();
                }}
              >
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {!todayProducts.isLoading && !todayProducts.isError && sortedToday.length === 0 && (
          <Card className="text-muted-foreground">
            <CardContent>
              <p>Hoy no has publicado productos.</p>
            </CardContent>
          </Card>
        )}

        {!todayProducts.isLoading && !todayProducts.isError && sortedToday.length > 0 && (
          <div className="space-y-3">
            {sortedToday.map((product) => (
              <MyProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <Card>
        <CardContent>
          {/* A real h2, not CardTitle: CardTitle renders a div, which would leave the section without a heading element. */}
          <h2 className="font-heading text-lg font-semibold">Publicar nuevo producto</h2>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="vendor-products-recipe">Receta</Label>
              <Select required value={recipeId} onValueChange={handleRecipeChange}>
                <SelectTrigger id="vendor-products-recipe" className="w-full">
                  <SelectValue placeholder="Selecciona una receta" />
                </SelectTrigger>
                <SelectContent>
                  {recipesQuery.data?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} · sugerido {formatPrice(r.suggestedPrice)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Link
                to="/vendor/recipes"
                className="inline-block text-xs font-medium text-primary hover:underline"
              >
                Gestionar recetas →
              </Link>
            </div>

            <div className="space-y-1">
              <Label htmlFor="vendor-products-name">Nombre del producto</Label>
              <Input
                id="vendor-products-name"
                type="text"
                maxLength={200}
                minLength={1}
                placeholder="Pan de yema (docena)"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="vendor-products-price">
                Precio{' '}
                {selectedRecipe && (
                  <span className="text-xs font-normal text-muted-foreground">
                    Sugerido: {formatPrice(selectedRecipe.suggestedPrice)}
                  </span>
                )}
              </Label>
              {/* step must be one centavo. With step="0.10" and min="0.01" the
                  browser only accepts min + n*0.10 (0.01, 0.11, ... 9.21, 9.31),
                  so a round price and most suggested prices were rejected by
                  native constraint validation before validate() ever ran. */}
              <Input
                id="vendor-products-price"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-32"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="vendor-products-available-date">Fecha disponible</Label>
              <Input
                id="vendor-products-available-date"
                type="date"
                required
                value={availableDate}
                onChange={(e) => setAvailableDate(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="vendor-products-closes-at">Hora de cierre</Label>
              <Input
                id="vendor-products-closes-at"
                type="datetime-local"
                required
                value={closesAtLocal}
                onChange={(e) => setClosesAtLocal(e.target.value)}
              />
            </div>

            {validationError && (
              <p className="text-sm text-destructive" role="alert">
                {validationError}
              </p>
            )}

            {serverError && publish.error && (() => {
              const status = toApiError(publish.error).status;
              if (status === 403) {
                return (
                  <Alert>
                    <AlertTitle>Solo los vendedores pueden publicar productos.</AlertTitle>
                    <AlertDescription>
                      <Link
                        to="/catalog"
                        className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
                      >
                        Volver al catálogo →
                      </Link>
                    </AlertDescription>
                  </Alert>
                );
              }
              if (status === 404) {
                return (
                  <Alert variant="destructive">
                    <AlertTitle>La receta seleccionada ya no existe.</AlertTitle>
                  </Alert>
                );
              }
              if (status === 409) {
                return (
                  <Alert variant="destructive">
                    <AlertTitle>{serverError}</AlertTitle>
                    <AlertDescription>
                      <Button type="button" variant="outline" onClick={() => handleSubmit()}>
                        Reintentar
                      </Button>
                    </AlertDescription>
                  </Alert>
                );
              }
              return (
                <Alert variant="destructive">
                  <AlertTitle>{serverError}</AlertTitle>
                </Alert>
              );
            })()}

            <Button type="submit" disabled={publish.isPending}>
              {publish.isPending ? 'Publicando…' : 'Publicar producto'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
