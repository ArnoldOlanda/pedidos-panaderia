import { getBrowserPushSupport } from '../lib/push';
import { usePushPublicKey } from '../hooks/use-push-public-key';
import { usePushSubscriptions } from '../hooks/use-push-subscriptions';
import { useSubscribePush } from '../hooks/use-subscribe-push';
import { useUnsubscribePush } from '../hooks/use-unsubscribe-push';

export function PushToggle() {
  const support = getBrowserPushSupport();

  if (!support.supported) return null;

  const publicKeyQuery = usePushPublicKey();
  const subsQuery = usePushSubscriptions();
  const subscribe = useSubscribePush();
  const unsubscribe = useUnsubscribePush();

  if (publicKeyQuery.isLoading || subsQuery.isLoading) {
    return (
      <button
        type="button"
        disabled
        className="text-sm text-slate-400"
        aria-label="Cargando estado de notificaciones"
      >
        …
      </button>
    );
  }

  const subs = subsQuery.data ?? [];
  const isSubscribed = subs.length > 0;
  const isBusy = subscribe.isPending || unsubscribe.isPending;
  const permissionDenied =
    typeof Notification !== 'undefined' && Notification.permission === 'denied';

  const baseBtn =
    'text-sm px-3 py-1 rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const onBtnClass = 'bg-amber-500 text-white hover:bg-amber-600';
  const offBtnClass = 'bg-slate-200 text-slate-800 hover:bg-slate-300';

  if (isSubscribed && subs[0]) {
    const endpoint = subs[0].endpoint;
    return (
      <button
        type="button"
        title={
          permissionDenied
            ? 'Permiso bloqueado — habilítalo en la configuración de tu navegador'
            : undefined
        }
        disabled={isBusy || permissionDenied}
        onClick={() => unsubscribe.mutate(endpoint)}
        className={`${baseBtn} ${offBtnClass}`}
      >
        {isBusy ? '…' : `Desactivar notificaciones${subs.length > 1 ? ` (${subs.length})` : ''}`}
      </button>
    );
  }

  return (
    <button
      type="button"
      title={
        permissionDenied
          ? 'Permiso bloqueado — habilítalo en la configuración de tu navegador'
          : undefined
      }
      disabled={isBusy || permissionDenied}
      onClick={() => subscribe.mutate()}
      className={`${baseBtn} ${onBtnClass}`}
    >
      {isBusy ? '…' : 'Activar notificaciones'}
    </button>
  );
}