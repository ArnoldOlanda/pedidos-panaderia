import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PushSubscription } from './push-subscription.entity';
import { PushSubscriptionsService } from './push-subscriptions.service';
import { WebpushService } from './webpush.service';
import { PushController } from './push.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PushSubscription]), AuthModule],
  controllers: [PushController],
  providers: [PushSubscriptionsService, WebpushService],
  exports: [WebpushService],
})
export class PushModule {}