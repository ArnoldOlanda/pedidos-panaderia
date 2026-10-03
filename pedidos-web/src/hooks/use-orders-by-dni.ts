import { useQuery } from '@tanstack/react-query';
import { listOrdersByDni } from '../lib/orders';

export function useOrdersByDni(dni: string | undefined) {
  return useQuery({
    queryKey: ['orders', 'by-dni', dni],
    queryFn: () => listOrdersByDni(dni!),
    enabled: !!dni && /^\d{8}$/.test(dni),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}