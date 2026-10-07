import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useProduct } from '../hooks/use-product';
import { usePlaceOrder } from '../hooks/use-place-order';
import { toApiError } from '../lib/api';
import { getOrCreateDeviceId } from '../lib/device';
import { closesInLabel, formatCloseTimeLima, formatPrice } from '../lib/format';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';

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
    <Card aria-hidden="true">
      <CardContent className="space-y-3">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </CardContent>
    </Card>
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

  const placeOrder = usePlaceOrder();
  const pending = placeOrder.isPending;

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
      <Link to="/catalog" className="text-sm text-primary hover:underline">
        ← Catálogo
      </Link>

      {isLoading && <NewOrderSkeleton />}

      {!isLoading && isNotFound && (
        <Card className="text-muted-foreground">
          <CardContent>
            <p>No encontramos este producto</p>
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

      {!isLoading && !isError && data && productIsClosed && (
        <Card className="text-muted-foreground">
          <CardHeader>
            {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
            <h1 className="font-heading text-2xl font-semibold tracking-tight">{data.name}</h1>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">Este producto ya no acepta pedidos.</p>
            <Link
              to="/catalog"
              className="inline-block text-sm font-medium text-primary hover:underline"
            >
              Volver al catálogo
            </Link>
          </CardContent>
        </Card>
      )}

      {!isLoading && !isError && data && !productIsClosed && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              {/* A real h1, not CardTitle: CardTitle renders a div, which would leave the page without a heading element. */}
              <h1 className="font-heading text-2xl font-semibold tracking-tight">{data.name}</h1>
              <p className="text-sm text-muted-foreground">
                {formatPrice(data.price)} · Cierra a las {formatCloseTimeLima(data.closesAt)} ·{' '}
                {closesInLabel(data.closesAt, data.closed)}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              <fieldset className="space-y-3 border-t border-border pt-4">
                <legend className="text-sm font-medium">Datos del comprador</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="buyer-dni">DNI</Label>
                    <Input
                      id="buyer-dni"
                      type="text"
                      inputMode="numeric"
                      pattern="\d{8}"
                      maxLength={8}
                      required
                      value={buyer.buyerDni}
                      onChange={(e) => setBuyer({ ...buyer, buyerDni: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="buyer-carrera">Carrera / especialidad</Label>
                    <Input
                      id="buyer-carrera"
                      type="text"
                      maxLength={MAX_NAME_LENGTH}
                      required
                      value={buyer.buyerCarrera}
                      onChange={(e) => setBuyer({ ...buyer, buyerCarrera: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="buyer-name">Nombre</Label>
                    <Input
                      id="buyer-name"
                      type="text"
                      maxLength={MAX_NAME_LENGTH}
                      required
                      value={buyer.buyerName}
                      onChange={(e) => setBuyer({ ...buyer, buyerName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="buyer-apellidos">Apellidos</Label>
                    <Input
                      id="buyer-apellidos"
                      type="text"
                      maxLength={MAX_NAME_LENGTH}
                      required
                      value={buyer.buyerApellidos}
                      onChange={(e) => setBuyer({ ...buyer, buyerApellidos: e.target.value })}
                    />
                  </div>
                </div>
              </fieldset>

              <Field className="w-32">
                <FieldLabel htmlFor="quantity">Cantidad</FieldLabel>
                <Input
                  id="quantity"
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
                />
                <FieldDescription>máx. {MAX_QUANTITY}</FieldDescription>
              </Field>

              <p className="text-sm">
                Total: <span className="font-semibold">{formatPrice(data.price * quantity)}</span>
              </p>

              {orderError && (
                <Alert variant="destructive">
                  <p>{orderError.message || 'No pudimos registrar el pedido'}</p>
                  <Button type="button" className="mt-3" onClick={() => handleSubmit()}>
                    Reintentar
                  </Button>
                </Alert>
              )}

              <Button type="submit" disabled={pending || !buyerValid}>
                {pending ? 'Procesando…' : 'Confirmar pedido'}
              </Button>
            </CardContent>
          </Card>
        </form>
      )}

      {/* role=status rather than aria-live on the skeleton: a live region has to
          pre-exist and announce its own content change, not the decorative bars. */}
      <span role="status" className="sr-only">
        {isLoading ? 'Cargando producto' : ''}
      </span>
    </section>
  );
}