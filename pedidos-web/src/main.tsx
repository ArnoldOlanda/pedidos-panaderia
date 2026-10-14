import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { router } from './router';
import { queryClient } from './lib/query-client';
import { AuthBootstrap } from './components/auth-bootstrap';
import { ensurePushSubscription } from './lib/push';
import './index.css';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
    console.warn('SW registration failed:', err);
  });

  // The SW fires `push-subscription-changed` when the browser rotates
  // the push endpoint (key rotation, VAPID refresh, etc.). Without this
  // listener the rotation goes unheard and the backend keeps the old
  // endpoint, so every subsequent push goes to a dead address and
  // surfaces as a silent 410 in the Nest logs. We re-run the same
  // subscribe flow the user-driven button uses so the new endpoint
  // gets persisted and a query invalidation refreshes the UI state.
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'push-subscription-changed') return;
    console.debug('[push] SW signaled push-subscription-changed, re-subscribing');
    ensurePushSubscription()
      .then((result) => {
        console.debug('[push] auto re-subscribe success', result.endpoint.slice(0, 64));
        void queryClient.invalidateQueries({ queryKey: ['push', 'mine'] });
      })
      .catch((err) => {
        console.error('[push] auto re-subscribe failed', err);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
    </QueryClientProvider>
  </StrictMode>
);
