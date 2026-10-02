import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Product } from '../lib/products';

export function useMyTodayProducts() {
  return useQuery({
    queryKey: ['products', 'mine', 'today'],
    queryFn: async () => {
      const { data } = await api.get<Product[]>('/products/mine/today');
      return data;
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}