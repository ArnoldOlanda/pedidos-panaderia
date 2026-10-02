import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProductsService } from '../products/products.service';

@Injectable()
export class AutoCloseService {
  private readonly logger = new Logger(AutoCloseService.name);
  constructor(private readonly products: ProductsService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron(): Promise<void> {
    try {
      const { closedCount } = await this.products.closeExpired();
      if (closedCount > 0) {
        this.logger.log(`Auto-closed ${closedCount} expired product(s).`);
      }
    } catch (err) {
      this.logger.error('Auto-close failed', err as Error);
    }
  }
}