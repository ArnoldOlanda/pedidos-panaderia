import { useQuery } from '@tanstack/react-query';
import { getBrowserPushSupport, getPublicKey } from '../lib/push';

export function usePushPublicKey() {
  return useQuery({
    queryKey: ['push', 'publicKey'],
    queryFn: getPublicKey,
    // The VAPID public key is configured at deploy time and never rotates
    // inside a session. Skip the fetch entirely on browsers that cannot use
    // push (e.g. iOS Safari) so we never even hit the network.
    enabled: getBrowserPushSupport().supported,
    staleTime: 1000 * 60 * 60,
  });
}