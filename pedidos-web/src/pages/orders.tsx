import { FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useOrdersByDni } from '../hooks/use-orders-by-dni';
import { formatPrice } from '../lib/format';
import type { Order } from '../lib/orders';
import { STATUS_BADGE, STATUS_LABEL, TIME_FORMAT } from '../lib/order-status';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

const LAST_DNI_KEY = 'buyer:last-dni';
const DNI_PATTERN = /^\d{8}$/;

function OrderCard({ order }: { order: Order }) {
  const total = order.product.price * order.quantity;
  return (
    <article>
      <Card>
        <CardContent className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            {/* A real h2, not CardTitle: CardTitle renders a div, which would leave the card without a heading element. */}
            <h2 className="font-heading text-lg font-semibold">
              {order.product.name} × {order.quantity}
            </h2>
            <p className="text-xs text-muted-foreground">
              {TIME_FORMAT.format(new Date(order.createdAt))}
            </p>
          </div>
          <div className="text-right space-y-1">
            <Badge {...STATUS_BADGE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
            <p className="text-sm font-medium text-foreground">{formatPrice(total)}</p>
          </div>
        </CardContent>
      </Card>
    </article>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="space-y-3">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
      </CardContent>
    </Card>
  );
}

export function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDni = searchParams.get('dni') ?? '';
  const [dni, setDni] = useState(initialDni);
  const [submittedDni, setSubmittedDni] = useState(initialDni);

  useEffect(() => {
    if (dni) return;
    if (typeof localStorage === 'undefined') return;
    const stored = localStorage.getItem(LAST_DNI_KEY);
    if (stored) setDni(stored);
  }, [dni]);

  const query = useOrdersByDni(submittedDni);
  const { data, isLoading, isError, refetch } = query;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = dni.trim();
    if (!DNI_PATTERN.test(trimmed)) return;
    setSubmittedDni(trimmed);
    setSearchParams({ dni: trimmed }, { replace: true });
  };

  return (
    <section className="space-y-4">
      {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
      <h1 className="font-heading text-2xl font-semibold">Mis pedidos</h1>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="dni">DNI</Label>
              <Input
                id="dni"
                type="text"
                inputMode="numeric"
                pattern="\d{8}"
                maxLength={8}
                required
                value={dni}
                onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <Button type="submit" disabled={!DNI_PATTERN.test(dni)}>
              Buscar pedidos
            </Button>
          </CardContent>
        </Card>
      </form>

      <p className="text-xs text-muted-foreground">
        Vendedores: ver pedidos recibidos{' '}
        <Link to="/vendor/orders" className="text-primary hover:underline">
          aquí
        </Link>
        .
      </p>

      {/* role=status rather than aria-live: a live region must pre-exist and announce
          its own content change, not the name of the control the user just activated. */}
      <span role="status" className="sr-only">
        {isLoading ? 'Cargando pedidos' : ''}
      </span>

      {isLoading && (
        <div aria-hidden="true" className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!isLoading && isError && (
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar tus pedidos</AlertTitle>
          <AlertDescription>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void refetch();
              }}
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && submittedDni && data && data.length === 0 && (
        <Card className="text-muted-foreground">
          <CardContent className="space-y-3">
            <p>No encontramos pedidos para este DNI.</p>
            <Link
              to="/catalog"
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Ver catálogo →
            </Link>
          </CardContent>
        </Card>
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
