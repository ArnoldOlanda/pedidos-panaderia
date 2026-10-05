import { Link } from 'react-router-dom';
import { useTodayProducts } from '../hooks/use-today-products';
import { closesInLabel, formatCloseTimeLima, formatPrice } from '../lib/format';
import type { Product } from '../lib/products';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function ProductCard({ product }: { product: Product }) {
  return (
    <Card>
      <CardHeader>
        {/* A real h2, not CardTitle: CardTitle renders a div, which would drop the heading. */}
        <h2 className="font-heading text-lg font-semibold tracking-tight">{product.name}</h2>
        <p className="text-primary font-medium">{formatPrice(product.price)}</p>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Cierra a las {formatCloseTimeLima(product.closesAt)} ·{' '}
          {closesInLabel(product.closesAt, product.closed)}
        </p>
        <Link
          to={`/catalog/${product.id}`}
          className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          Ver detalle
        </Link>
      </CardContent>
    </Card>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-3/4" />
      </CardContent>
    </Card>
  );
}

export function CatalogPage() {
  const { data, isLoading, isError, refetch } = useTodayProducts();

  return (
    <section className="space-y-4">
      {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Catálogo diario</h1>

      {isLoading && (
        <div aria-hidden="true" className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!isLoading && isError && (
        <Alert variant="destructive">
          <p>No pudimos cargar el catálogo</p>
          <Button
            type="button"
            className="mt-3"
            onClick={() => {
              void refetch();
            }}
          >
            Reintentar
          </Button>
        </Alert>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <Card>
          <CardContent>
            <p className="text-muted-foreground">Hoy no hay productos publicados</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* role=status rather than aria-live on the skeleton: a live region has to
          pre-exist and announce its own content change, not the decorative bars. */}
      <span role="status" className="sr-only">
        {isLoading ? 'Cargando catálogo' : ''}
      </span>
    </section>
  );
}
