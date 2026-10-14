import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush = require('web-push');
import { PushSubscriptionsService } from './push-subscriptions.service';

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface PushDeliveryResult {
  delivered: number;
  removed: number;
}

export interface SendContext {
  // Free-form context attached to every log line this send produces, so
  // an operator (or a future Sentry) can trace which order / trigger
  // caused which delivery or removal. Kept narrow on purpose; the only
  // call site today is orders.service passing the order id.
  orderId?: string;
}

@Injectable()
export class WebpushService implements OnModuleInit {
  private readonly logger = new Logger(WebpushService.name);
  private initialized = false;

  constructor(
    private readonly subscriptions: PushSubscriptionsService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    // Advisory from ODD-3.1: fail fast when VAPID is missing rather than
    // surface a confusing 500 on the first push send.
    const subject = this.config.getOrThrow<string>('VAPID_SUBJECT');
    const publicKey = this.config.getOrThrow<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.getOrThrow<string>('VAPID_PRIVATE_KEY');

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.initialized = true;
    this.logger.log(`VAPID configured for ${subject}`);
  }

  async sendToDevice(
    deviceId: string,
    payload: PushPayload,
    context: SendContext = {},
  ): Promise<PushDeliveryResult> {
    if (!this.initialized) {
      throw new Error('WebpushService not initialized');
    }
    const ctx = context.orderId ? ` [order ${context.orderId}]` : '';
    const subs = await this.subscriptions.listForDevice(deviceId);
    if (subs.length === 0) {
      // No live subscriptions for this device: the push will not be
      // delivered. Logged at warn so the operator notices when a LISTO
      // (or any future trigger) silently fails to reach its buyer. The
      // most common cause is a 410 that the previous send already
      // cleaned up, in which case the buyer must re-activate from the
      // header toggle.
      this.logger.warn(
        `no live subscriptions for device ${deviceId}${ctx} \u2014 push dropped (tag=${payload.tag ?? 'none'})`,
      );
      return { delivered: 0, removed: 0 };
    }

    this.logger.debug(
      `sending push to ${subs.length} subscription(s) for device ${deviceId}${ctx} (tag=${payload.tag ?? 'none'})`,
    );

    const body = JSON.stringify(payload);
    let delivered = 0;
    let removed = 0;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60, urgency: 'normal' },
        );
        delivered += 1;
        this.logger.debug(
          `delivered push to device ${deviceId} endpoint ${maskEndpoint(sub.endpoint)}${ctx}`,
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode ?? 0;
        if (code === 404 || code === 410) {
          await this.subscriptions.unsubscribe(sub.deviceId, sub.endpoint);
          removed += 1;
          this.logger.warn(
            `removed stale push (status ${code}) for device ${deviceId} endpoint ${maskEndpoint(sub.endpoint)}${ctx}`,
          );
        } else {
          this.logger.error(
            `push failed for device ${deviceId} endpoint ${maskEndpoint(sub.endpoint)} status ${code}: ${(err as Error).message}${ctx}`,
          );
        }
      }
    }
    return { delivered, removed };
  }
}

// Truncate the endpoint so log lines stay readable and the tail of the
// push service URL (which can include a per-subscription token) does
// not leak into operator consoles. The host and the first 16 chars of
// the path are enough to identify FCM vs Mozilla vs Apple and the
// coarse region; the rest is opaque.
function maskEndpoint(endpoint: string): string {
  if (endpoint.length <= 64) return endpoint;
  return `${endpoint.slice(0, 64)}\u2026`;
}