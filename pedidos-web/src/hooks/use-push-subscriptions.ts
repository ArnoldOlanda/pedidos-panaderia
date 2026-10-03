import { useQuery } from '@tanstack/react-query';
import { getBrowserPushSupport, listMySubscriptions } from '../lib/push';

export function usePushSubscriptions() {
  return useQuery({
    queryKey: ['push', 'mine'],
    queryFn: listMySubscriptions,
    // The device-scoped list is only meaningful in browsers that actually
    // support it; otherwise the request would 400 because no subscription
    // could ever exist locally.
    enabled: getBrowserPushSupport().supported,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}