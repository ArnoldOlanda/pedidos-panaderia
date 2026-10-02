import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unsubscribeServer } from '../lib/push';

export function useUnsubscribePush() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (endpoint: string) => unsubscribeServer(endpoint),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['push', 'mine'] });
    },
  });
}