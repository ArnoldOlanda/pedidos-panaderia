import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProductsService } from '../products/products.service';

@Injectable()
export class AutoCloseService {
  private readonly logger = new Logger(AutoCloseService.name);
  constructor(private readonly products: ProductsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron(): Promise<void> {
    let closed: Awaited<ReturnType<ProductsService['closeExpired']>>['closed'] = [];
    try {
      const result = await this.products.closeExpired();
      if (result.closedCount > 0) {
        this.logger.log(`Auto-closed ${result.closedCount} expired product(s).`);
      }
      closed = result.closed;
    } catch (err) {
      this.logger.error('Auto-close failed', err as Error);
      return;
    }

    // Vendor-side push notifications on auto-close used to fire via
    // webpush.sendToUser(createdById, …). The push module is now strictly
    // device-scoped (X-Device-Id), and we no longer keep a user → deviceId
    // registry. Vendors still see the auto-close in the web UI when they
    // refresh their products list; a future "vendor default device" feature
    // can re-enable this loop without changing the public push contract.
    if (closed.length > 0) {
      for (const p of closed) {
        this.logger.log(
          `Auto-closed product ${p.id} (${p.name}) — vendor ${p.createdById} notified via UI`,
        );
      }
    }
  }
}