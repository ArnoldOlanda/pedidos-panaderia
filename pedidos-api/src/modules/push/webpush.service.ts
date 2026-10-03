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
  ): Promise<PushDeliveryResult> {
    if (!this.initialized) {
      throw new Error('WebpushService not initialized');
    }
    const subs = await this.subscriptions.listForDevice(deviceId);
    if (subs.length === 0) {
      return { delivered: 0, removed: 0 };
    }

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
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode ?? 0;
        if (code === 404 || code === 410) {
          await this.subscriptions.unsubscribe(sub.deviceId, sub.endpoint);
          removed += 1;
          this.logger.warn(
            `removed stale push (status ${code}) for device ${deviceId}`,
          );
        } else {
          this.logger.error(
            `push failed for device ${deviceId} endpoint ${sub.endpoint}: ${(err as Error).message}`,
          );
        }
      }
    }
    return { delivered, removed };
  }
}