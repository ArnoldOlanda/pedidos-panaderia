import { Button } from '@/components/ui/button';
import { detectProblematicBrowser, getBrowserPushSupport, type ProblematicBrowser } from '../lib/push';
import { usePushPublicKey } from '../hooks/use-push-public-key';
import { usePushSubscriptions } from '../hooks/use-push-subscriptions';
import { useSubscribePush } from '../hooks/use-subscribe-push';
import { useUnsubscribePush } from '../hooks/use-unsubscribe-push';

// The busy announcement is defined once so the busy button's accessible name and
// the live regions that announce it cannot drift apart.
const LOADING_LABEL = 'Cargando estado de notificaciones';

export function PushToggle() {
  // Pre-existing early return kept as-is: moving it below the hooks would be a
  // behaviour change outside this parity migration.
  const support = getBrowserPushSupport();

  if (!support.supported) return null;

  const publicKeyQuery = usePushPublicKey();
  const subsQuery = usePushSubscriptions();
  const subscribe = useSubscribePush();
  const unsubscribe = useUnsubscribePush();

  if (publicKeyQuery.isLoading || subsQuery.isLoading) {
    // No live region in this branch: it mounts with its content already present, so
    // an always-mounted region would announce nothing, and the disabled button's own
    // accessible name is what conveys the loading state.
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled
        aria-label={LOADING_LABEL}
        className="text-muted-foreground"
      >
        …
      </Button>
    );
  }

  const subs = subsQuery.data ?? [];
  const isSubscribed = subs.length > 0;
  const isBusy = subscribe.isPending || unsubscribe.isPending;
  const permissionDenied =
    typeof Notification !== 'undefined' && Notification.permission === 'denied';

  if (isSubscribed && subs[0]) {
    const endpoint = subs[0].endpoint;
    return (
      <>
        {/* Always mounted and only toggling its own content, so the busy notice is
            announced as a content change instead of announcing the pressed button. */}
        <span role="status" className="sr-only">
          {isBusy ? LOADING_LABEL : ''}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label={isBusy ? LOADING_LABEL : undefined}
          title={
            permissionDenied
              ? 'Permiso bloqueado — habilita las notificaciones desde la configuración del navegador'
              : undefined
          }
          disabled={isBusy || permissionDenied}
          onClick={() => unsubscribe.mutate(endpoint)}
        >
          {isBusy ? '…' : `Desactivar notificaciones${subs.length > 1 ? ` (${subs.length})` : ''}`}
        </Button>
      </>
    );
  }

  return (
    <>
      {/* Always mounted and only toggling its own content, so the busy notice is
          announced as a content change instead of announcing the pressed button. */}
      <span role="status" className="sr-only">
        {isBusy ? LOADING_LABEL : ''}
      </span>
      <Button
        type="button"
        variant="default"
        size="sm"
        aria-label={isBusy ? LOADING_LABEL : undefined}
        title={
          permissionDenied
            ? 'Permiso bloqueado — habilita las notificaciones desde la configuración del navegador'
            : undefined
        }
        disabled={isBusy || permissionDenied}
        onClick={() => subscribe.mutate()}
      >
        {isBusy ? '…' : 'Activar notificaciones'}
      </Button>
    </>
  );
}

// Sibling component rendered next to <PushToggle /> in the layout. Lets the
// user know, before they click 'Activar', that the current browser's push
// service is unreliable for our backend (FCM returns 410 on every new
// Opera subscription; Brave ships its own push relay). The hint is purely
// informational: PushToggle still renders and works for any browser that
// passes getBrowserPushSupport, so the cost of being wrong here is zero.
export function PushBrowserHint() {
  const problematic = detectProblematicBrowser();
  if (!problematic) return null;
  const label = browserLabel(problematic);
  return (
    <span
      className="text-xs text-muted-foreground hidden sm:inline whitespace-nowrap"
      title={`En ${label} las notificaciones pueden no entregarse. Para una mejor experiencia recomendamos Chrome o Edge.`}
      role="note"
    >
      ⚠ Para una mejor experiencia recomendamos Chrome o Edge
    </span>
  );
}

function browserLabel(b: ProblematicBrowser): string {
  return b === 'opera' ? 'Opera' : 'Brave';
}
