import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { closesInLabel, formatCloseTimeLima, formatPrice } from '@/lib/format';
import type { Product } from '../../lib/products';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article>
      <Card>
        <CardContent>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              {/* A real h3, not CardTitle: CardTitle renders a div, which would leave the card without a heading element. h3 nests it under the section's h2 heading. */}
              <h3 className="font-heading text-lg font-semibold">{product.name}</h3>
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
