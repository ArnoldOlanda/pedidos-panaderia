import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ProductsModule } from '../products/products.module';
import { AutoCloseService } from './auto-close.service';

@Module({
  imports: [ScheduleModule.forRoot(), ProductsModule],
  providers: [AutoCloseService],
  exports: [AutoCloseService],
})
export class SchedulerModule {}