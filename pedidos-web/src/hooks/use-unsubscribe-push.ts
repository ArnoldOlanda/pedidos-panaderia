import { useMutation, useQueryClient } from '@tanstack/react-query';
import { unsubscribeServer } from '../lib/push';
import { toast } from '../lib/toast';

export function useUnsubscribePush() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (endpoint: string) => unsubscribeServer(endpoint),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['push', 'mine'] });
    },
    onError: (err) => {
      toast.error(err, {
        fallback: 'No se pudo desactivar la suscripción',
      });
    },
  });
}