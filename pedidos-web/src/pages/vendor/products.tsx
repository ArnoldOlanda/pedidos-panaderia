import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import { useMyTodayProducts } from '../../hooks/use-my-today-products';
import { usePublishProduct } from '../../hooks/use-publish-product';
import type { PublishProductInput } from '../../hooks/use-publish-product';
import { toApiError } from '../../lib/api';
import { closesInLabel, formatCloseTimeLima, formatPrice } from '../../lib/format';
import type { Product } from '../../lib/products';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ProductFormDialog } from '@/components/products/product-form-dialog';
import { ProductCard } from '@/components/products/product-card';
import { ResponsiveRecordList } from '@/components/records/responsive-record-list';
import type { RecordColumn } from '@/components/records/responsive-record-list';
import { Skeleton } from '@/components/ui/skeleton';

const LOADING_LABEL = 'Cargando productos';

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
  const publish = usePublishProduct();

  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!flashMessage) return;
    const timer = setTimeout(() => setFlashMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [flashMessage]);

  const publishErrorStatus = publish.error ? toApiError(publish.error).status : null;

  const sortedToday = useMemo(() => {
    if (!todayProducts.data) return [];
    return [...todayProducts.data].sort((a, b) => a.closesAt.localeCompare(b.closesAt));
  }, [todayProducts.data]);

  const columns: RecordColumn<Product>[] = [
    { key: 'name', header: 'Nombre', className: 'text-foreground', render: (product) => product.name },
    {
      key: 'price',
      header: 'Precio',
      className: 'text-right text-primary font-medium',
      headerClassName: 'text-right',
      render: (product) => formatPrice(product.price),
    },
    {
      key: 'close',
      header: 'Cierre',
      className: 'text-muted-foreground',
      render: (product) => `Cierra a las ${formatCloseTimeLima(product.closesAt)} · ${closesInLabel(product.closesAt, product.closed)}`,
    },
    {
      key: 'status',
      header: 'Estado',
      render: (product) => (product.closed ? <Badge variant="secondary">cerrado</Badge> : null),
    },
  ];

  const handlePublish = (input: PublishProductInput) => {
    setServerError(null);
    publish.mutate(input, {
      onSuccess: () => {
        setCreateOpen(false);
        setFlashMessage('Producto publicado');
      },
      onError: (err) => {
        setServerError(toApiError(err).message || 'No pudimos publicar el producto');
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
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
          <h1 className="font-heading text-2xl font-semibold">Publicar producto</h1>
          {user?.name && (
            <p className="text-sm text-muted-foreground">Estás publicando como {user.name}</p>
          )}
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Publicar producto
        </Button>
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
          <ResponsiveRecordList
            records={sortedToday}
            columns={columns}
            getRowKey={(product) => product.id}
            renderCard={(product) => <ProductCard product={product} />}
          />
        )}
      </section>

      <ProductFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        size="lg"
        isSubmitting={publish.isPending}
        serverError={serverError}
        publishErrorStatus={publishErrorStatus}
        onSubmit={handlePublish}
      />
    </section>
  );
}
