import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProductsService } from '../products/products.service';
import { WebpushService } from '../push/webpush.service';

@Injectable()
export class AutoCloseService {
  private readonly logger = new Logger(AutoCloseService.name);
  constructor(
    private readonly products: ProductsService,
    private readonly webpush: WebpushService,
  ) {}

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

    if (closed.length === 0) return;

    try {
      for (const p of closed) {
        await this.webpush.sendToUser(p.createdById, {
          title: 'Tu producto se cerró',
          body: `${p.name} cerró su ventana de pedidos`,
          tag: `product-${p.id}`,
        });
      }
    } catch (err) {
      this.logger.error(
        `vendor push loop failed: ${(err as Error).message}`,
      );
    }
  }
}