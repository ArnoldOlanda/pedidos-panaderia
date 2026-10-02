import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductsModule } from '../products/products.module';
import { PushModule } from '../push/push.module';
import { AutoCloseService } from './auto-close.service';

@Module({
  imports: [ScheduleModule.forRoot(), ProductsModule, PushModule],
  providers: [AutoCloseService],
  exports: [AutoCloseService],
})
export class SchedulerModule {}