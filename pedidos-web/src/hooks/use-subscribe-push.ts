import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getPublicKey,
  subscribeBrowser,
  subscribeServer,
} from '../lib/push';

export function useSubscribePush() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // Reuse the cached public key when available to avoid a refetch.
      const cached = qc.getQueryData<string>(['push', 'publicKey']);
      const publicKey = cached ?? (await getPublicKey());

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
      });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['push', 'mine'] });
    },
  });
}