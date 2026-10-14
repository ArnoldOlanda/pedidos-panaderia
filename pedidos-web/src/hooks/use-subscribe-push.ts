import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ensurePushSubscription } from '../lib/push';
import { toast } from '../lib/toast';

export function useSubscribePush() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ensurePushSubscription,
    onSuccess: (result) => {
      console.debug('[push] subscribe mutation success', result);
      void qc.invalidateQueries({ queryKey: ['push', 'mine'] });
    },
    onError: (err) => {
      console.error('[push] subscribe mutation failed', err);
      // Surface the browser's actual reason for refusing the subscribe
      // (e.g. NotAllowedError in Brave when Web Push is disabled, or a
      // generic AbortError when the SW is not yet ready). Without this
      // the user sees a silent no-op after the public-key fetch, which
      // is what triggered the bug report that led to this fix.
      toast.error(err, {
        fallback: 'No se pudieron activar las notificaciones',
        hint: 'Verifica los permisos del navegador o prueba con otro',
      });
    },
  });
}