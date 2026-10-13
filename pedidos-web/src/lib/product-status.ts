import type { ComponentProps } from 'react';
import { Badge } from '@/components/ui/badge';
import { isProductClosed } from './format';
import type { Product } from './products';

export type ProductStatus = 'abierto' | 'cerrado';

// A product is closed when the stored flag is set or its close time has
// passed; see isProductClosed for why the flag alone is not enough.
export function productStatus(product: Pick<Product, 'closesAt' | 'closed'>): ProductStatus {
  return isProductClosed(product.closesAt, product.closed) ? 'cerrado' : 'abierto';
}

export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  abierto: 'abierto',
  cerrado: 'cerrado',
};

// Token utilities instead of literal colours, mirroring order-status.ts: the
// primary/amber variant for the live state, the muted secondary variant for
// the finished one. Keyed by ProductStatus so TypeScript enforces
// exhaustiveness. Shared by the vendor board table and its mobile card, which
// is why the state is derived here and not in each screen.
export const PRODUCT_STATUS_BADGE: Record<ProductStatus, ComponentProps<typeof Badge>> = {
  abierto: { variant: 'default' },
  cerrado: { variant: 'secondary' },
};
