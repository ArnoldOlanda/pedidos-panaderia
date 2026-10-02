import { useQuery } from '@tanstack/react-query';
import { listOrdersByProduct } from '../lib/orders';

export function useOrdersByProduct(productId: string | null) {
  return useQuery({
    queryKey: ['orders', 'by-product', productId],
    queryFn: () => listOrdersByProduct(productId as string),
    enabled: Boolean(productId),
    staleTime: 10_000,
    refetchInterval: 20_000, // so LISTO updates from the buyer's side show up
  });
}