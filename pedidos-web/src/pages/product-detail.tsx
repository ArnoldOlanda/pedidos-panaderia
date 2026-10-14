import { ShoppingBag } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useProduct } from '../hooks/use-product';
import { closesInLabel, formatCloseTimeLima, formatPrice } from '../lib/format';
import { toApiError } from '../lib/api';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function DetailSkeleton() {
  return (
    <Card aria-hidden="true">
      <CardContent className="space-y-3">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
  );
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, isError, error, refetch } = useProduct(id);
  const apiError = isError ? toApiError(error) : null;
  const isNotFound = apiError?.status === 404;

  return (
    <section className="space-y-4">
      <Link to="/catalog" className="text-sm text-primary hover:underline">
        ← Catálogo
      </Link>

      {isLoading && <DetailSkeleton />}

      {!isLoading && isNotFound && (
        <Card>
          <CardContent>
            <p className="text-muted-foreground">No encontramos este producto</p>
            <Link
              to="/catalog"
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Volver al catálogo
            </Link>
          </CardContent>
        </Card>
      )}

      {!isLoading && isError && !isNotFound && (
        <Alert variant="destructive">
          <p>No pudimos cargar este producto</p>
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

      {!isLoading && !isError && data && (
        <Card>
          <CardHeader>
            {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
            <h1 className="font-heading text-3xl font-semibold tracking-tight">{data.name}</h1>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-2xl text-primary">{formatPrice(data.price)}</p>
            <p className="text-sm text-muted-foreground">
              Cierra a las {formatCloseTimeLima(data.closesAt)} ·{' '}
              {closesInLabel(data.closesAt, data.closed)}
            </p>
            <p className="text-sm text-muted-foreground">
              Disponible: {data.availableDate.slice(0, 10)}
            </p>
            {data.closed || new Date(data.closesAt).getTime() <= Date.now() ? (
              <Button type="button" disabled>
                Pedido cerrado
              </Button>
            ) : (
              <Button asChild>
                <Link to={`/orders/new?productId=${data.id}`}>
                  <ShoppingBag aria-hidden="true" />
                  Pedir
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* role=status rather than aria-live on the skeleton: a live region has to
          pre-exist and announce its own content change, not the decorative bars. */}
      <span role="status" className="sr-only">
        {isLoading ? 'Cargando producto' : ''}
      </span>
    </section>
  );
}
