import { useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useMyTodayProducts } from '../../hooks/use-my-today-products';
import { useOrdersByProduct } from '../../hooks/use-orders-by-product';
import { useUpdateOrderStatus } from '../../hooks/use-update-order-status';
import { toApiError } from '../../lib/api';
import { formatPrice } from '../../lib/format';
import type { Order } from '../../lib/orders';
import { STATUS_BADGE, STATUS_LABEL, TIME_FORMAT } from '../../lib/order-status';
import type { Product } from '../../lib/products';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const LOADING_LABEL = 'Cargando pedidos';
const SAVING_LABEL = 'Guardando…';

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
    <article>
      <Card>
        <CardContent>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="font-heading text-lg font-semibold">
                {order.buyerName} {order.buyerApellidos}
              </h2>
              <p className="text-xs text-muted-foreground">DNI {order.buyerDni} · {order.buyerCarrera}</p>
              <p className="text-sm text-muted-foreground">
                × {order.quantity} {order.quantity === 1 ? 'unidad' : 'unidades'}
              </p>
              <p className="text-xs text-muted-foreground">{TIME_FORMAT.format(new Date(order.createdAt))}</p>
            </div>
            <div className="text-right">
              <Badge {...STATUS_BADGE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
              {/* role=status rather than aria-live on a conditionally mounted node:
                  the live region has to pre-exist and announce its own content change. */}
              <p
                role="status"
                className={isThisPending ? 'mt-2 text-xs text-muted-foreground' : 'sr-only'}
              >
                {isThisPending ? SAVING_LABEL : ''}
              </p>
            </div>
          </div>

          {!isThisPending && !thisError && order.status === 'PENDIENTE' && (
            <Button type="button" className="mt-3" onClick={() => trigger('LISTO')}>
              Marcar LISTO
            </Button>
          )}

          {!isThisPending && !thisError && order.status === 'LISTO' && (
            <Button
              type="button"
              className="mt-3 bg-success text-success-foreground hover:bg-success/90"
              onClick={() => trigger('ENTREGADO')}
            >
              Marcar ENTREGADO
            </Button>
          )}

          {thisError && (
            <Alert variant="destructive" className="mt-3">
              <AlertTitle>
                {thisError.status === 400
                  ? thisError.message
                  : 'No pudimos actualizar este pedido. Reintenta'}
              </AlertTitle>
              <AlertDescription>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const next = order.status === 'PENDIENTE' ? 'LISTO' : 'ENTREGADO';
                    trigger(next);
                  }}
                >
                  Reintentar
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </article>
  );
}

function OrderSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/5" />
      </CardContent>
    </Card>
  );
}

function OrderList({ productId }: { productId: string }) {
  const ordersQuery = useOrdersByProduct(productId);
  const isLoading = ordersQuery.isLoading;

  const orders = ordersQuery.data ?? [];

  return (
    <>
      {/* role=status rather than aria-live on the skeleton: a live region has to
          pre-exist and announce its own content change, not the decorative bars. */}
      <span role="status" className="sr-only">
        {isLoading ? LOADING_LABEL : ''}
      </span>

      {isLoading && (
        <div aria-hidden="true" className="space-y-3">
          <OrderSkeleton />
          <OrderSkeleton />
          <OrderSkeleton />
        </div>
      )}

      {!isLoading && ordersQuery.isError && (
        <Alert variant="destructive">
          <AlertTitle>No pudimos cargar los pedidos</AlertTitle>
          <AlertDescription>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void ordersQuery.refetch();
              }}
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !ordersQuery.isError && orders.length === 0 && (
        <Card className="text-muted-foreground">
          <CardContent>
            <p>Nadie ha pedido este producto todavía.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !ordersQuery.isError && orders.length > 0 && (
        <div className="space-y-3">
          {orders.map((order) => (
            <OrderRow key={order.id} order={order} productId={productId} />
          ))}
        </div>
      )}
    </>
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
      <Card className="text-muted-foreground">
        <CardContent className="space-y-3">
          {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
          <h1 className="font-heading text-2xl font-semibold text-foreground">Pedidos recibidos</h1>
          <p className="text-sm">Esta sección es solo para vendedores.</p>
          <Link
            to="/orders"
            className="inline-block text-sm font-medium text-primary hover:underline"
          >
            Ir a Mis pedidos →
          </Link>
        </CardContent>
      </Card>
    );
  }

  const noProducts = !todayProducts.isLoading && !todayProducts.isError && products.length === 0;

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
        <h1 className="font-heading text-2xl font-semibold">Pedidos recibidos</h1>
        {user?.name && (
          <p className="text-sm text-muted-foreground">Estás gestionando pedidos como {user.name}</p>
        )}
      </header>

      {noProducts && (
        <Card className="text-muted-foreground">
          <CardContent className="space-y-3">
            <p>Hoy no has publicado productos.</p>
            <Link
              to="/vendor/products"
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Ve a Publicar producto para empezar →
            </Link>
          </CardContent>
        </Card>
      )}

      {!noProducts && products.length > 0 && selectedProductId && (
        <>
          <div className="space-y-1">
            <Label htmlFor="vendor-orders-product">Producto</Label>
            <Select value={selectedProductId} onValueChange={handleProductChange}>
              <SelectTrigger id="vendor-orders-product" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {products.map((p: Product) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} · {formatPrice(p.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <OrderList productId={selectedProductId} />
        </>
      )}
    </section>
  );
}
