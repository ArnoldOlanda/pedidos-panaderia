import { useQuery } from '@tanstack/react-query';
import { getProduct } from '../lib/products';

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: () => getProduct(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}