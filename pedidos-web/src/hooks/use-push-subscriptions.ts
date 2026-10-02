import { useQuery } from '@tanstack/react-query';
import { listMySubscriptions } from '../lib/push';

export function usePushSubscriptions() {
  return useQuery({
    queryKey: ['push', 'mine'],
    queryFn: listMySubscriptions,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}