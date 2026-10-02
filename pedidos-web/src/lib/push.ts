import { api } from './api';

// Shape returned by GET /api/push/mine. Matches PushSubscription entity.
export interface MySubscription {
  id: string;
  endpoint: string;
  createdAt: string;
  updatedAt: string;
}

// Shape the browser's PushSubscription serializes to (a subset of what
// service-worker subscribe() returns).
export interface SerializedPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
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