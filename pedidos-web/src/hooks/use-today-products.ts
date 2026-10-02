import { useQuery } from '@tanstack/react-query';
import { listTodayProducts } from '../lib/products';

export function useTodayProducts() {
  return useQuery({
    queryKey: ['products', 'today'],
    queryFn: listTodayProducts,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}