import { useQuery } from '@tanstack/react-query';
import { listMyOrders } from '../lib/orders';

export function useMyOrders() {
  return useQuery({
    queryKey: ['orders', 'mine'],
    queryFn: listMyOrders,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}