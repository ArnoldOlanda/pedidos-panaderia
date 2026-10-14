import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getPublicKey, subscribeBrowser, subscribeServer } from '../lib/push';
import { getOrCreateDeviceId } from '../lib/device';
import { toast } from '../lib/toast';

export function useSubscribePush() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Always fetch the public key on demand so we never rely on stale
      // cache from a prior session where the VAPID key may have rotated.
      const publicKey = await getPublicKey();

      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
        throw new Error('Permiso de notificaciones denegado');
      }

      const browserSub = await subscribeBrowser(publicKey);
      const json = browserSub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };
      return subscribeServer({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        deviceId: getOrCreateDeviceId(),
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['push', 'mine'] });
    },
    onError: (err) => {
      // Surface the browser's actual reason for refusing the subscribe
      // (e.g. NotAllowedError in Brave when Web Push is disabled, or a
      // generic AbortError when the SW is not yet ready). Without this
      // the user sees a silent no-op after the public-key fetch, which
      // is what triggered the bug report that led to this fix.
      toast.error(err, {
        fallback: 'No se pudieron activar las notificaciones',
        hint: 'Revisá los permisos del navegador o probá con otro',
      });
    },
  });
}