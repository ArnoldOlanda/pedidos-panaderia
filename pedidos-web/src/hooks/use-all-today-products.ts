import { useQuery } from '@tanstack/react-query';
import { listAllTodayProducts } from '../lib/products';

/**
 * Today's products from every vendor, for the shared publish-product board.
 * Vendor-only endpoint; the public catalog keeps using `useTodayProducts`.
 */
export function useAllTodayProducts() {
  return useQuery({
    queryKey: ['products', 'all', 'today'],
    queryFn: listAllTodayProducts,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
