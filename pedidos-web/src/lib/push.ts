import { api } from './api';
import { getOrCreateDeviceId } from './device';

// Shape returned by GET /api/push/mine. Matches PushSubscription entity.
export interface MySubscription {
  id: string;
  endpoint: string;
  createdAt: string;
  updatedAt: string;
}

// Shape the browser's PushSubscription serializes to (a subset of what
// service-worker subscribe() returns). The backend persists deviceId alongside
// the endpoint so the LISTO push can target the right browser even when there
// is no logged-in user.
export interface SerializedPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  deviceId: string;
}

export async function getPublicKey(): Promise<string> {
  const { data } = await api.get<{ publicKey: string }>('/push/public-key');
  return data.publicKey;
}

export async function listMySubscriptions(): Promise<MySubscription[]> {
  const { data } = await api.get<MySubscription[]>('/push/mine');
  return data;
}

export async function subscribeServer(
  subscription: SerializedPushSubscription,
): Promise<{ id: string; endpoint: string }> {
  const { data } = await api.post<{ id: string; endpoint: string }>(
    '/push/subscribe',
    subscription,
  );
  return data;
}

// Re-usable subscribe flow: fetch the public key, request permission if
// still 'default', validate 'granted', then either reuse the existing
// PushSubscription (kept alive across page reloads) or call
// pushManager.subscribe to mint a new one, and finally persist it on the
// backend. Used both by the user-driven subscribe mutation and by the
// service-worker 'push-subscription-changed' message handler, which
// re-runs the same flow when the browser rotates the endpoint.
export async function ensurePushSubscription(): Promise<{ id: string; endpoint: string }> {
  console.debug('[push] ensure: fetching public key');
  const publicKey = await getPublicKey();
  console.debug('[push] ensure: permission is', typeof Notification !== 'undefined' ? Notification.permission : 'unavailable');
  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
    console.debug('[push] ensure: requesting permission');
    await Notification.requestPermission();
    console.debug('[push] ensure: permission now', Notification.permission);
  }
  if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
    throw new Error('Permiso de notificaciones denegado');
  }
  console.debug('[push] ensure: calling subscribeBrowser');
  const browserSub = await subscribeBrowser(publicKey);
  const json = browserSub.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  console.debug('[push] ensure: persisting on server, endpoint =', json.endpoint.slice(0, 64));
  return subscribeServer({
    endpoint: json.endpoint,
    keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    deviceId: getOrCreateDeviceId(),
  });
}

export async function unsubscribeServer(endpoint: string): Promise<{ removed: boolean }> {
  const { data } = await api.delete<{ removed: boolean }>('/push/unsubscribe', {
    params: { endpoint },
  });
  return data;
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const trimmed = base64String.trim();
  const padded = trimmed
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(trimmed.length + ((4 - (trimmed.length % 4)) % 4), '=');
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = raw.charCodeAt(i);
  }
  return out;
}

export interface BrowserPushSupport {
  supported: boolean;
  reason?: string;
}

export function getBrowserPushSupport(): BrowserPushSupport {
  if (typeof window === 'undefined') {
    return { supported: false, reason: 'window no disponible' };
  }
  if (!('serviceWorker' in navigator)) {
    return { supported: false, reason: 'serviceWorker no soportado' };
  }
  if (!('PushManager' in window)) {
    return { supported: false, reason: 'PushManager no soportado' };
  }
  if (!window.isSecureContext) {
    return { supported: false, reason: 'contexto no seguro' };
  }
  return { supported: true };
}

// Browsers that pass getBrowserPushSupport() but ship a push service our
// backend does not talk to: Opera routes through FCM in a way that
// consistently returns 410 here (see pedidos-web/push-browser-compat in
// memory), and Brave ships its own Brave-Push relay that we never
// wired. Chrome and Edge use stock Web Push against the services we
// already integrate with. Surfacing this in the UI lets the user switch
// before they spend time debugging a "I activated but nothing arrives"
// scenario.
export type ProblematicBrowser = 'opera' | 'brave';

export function detectProblematicBrowser(): ProblematicBrowser | null {
  if (typeof navigator === 'undefined') return null;
  const ua = navigator.userAgent;
  // Brave reveals itself with the "Brave/" token. The order matters:
  // Brave also reports "Chrome/" because it is Chromium-based.
  if (/Brave\//i.test(ua)) return 'brave';
  // Opera 15+ (Chromium-based) reports "OPR/".
  if (/OPR\//i.test(ua)) return 'opera';
  return null;
}

export async function subscribeBrowser(
  publicKeyB64: string,
): Promise<PushSubscription> {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    // The PushManager.subscribe signature expects a BufferSource backed by
    // an ArrayBuffer (not a SharedArrayBuffer); cast through unknown to
    // satisfy the DOM lib's narrowed BufferSource generic.
    const key = urlBase64ToUint8Array(publicKeyB64) as unknown as BufferSource;
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    });
  }
  return sub;
}