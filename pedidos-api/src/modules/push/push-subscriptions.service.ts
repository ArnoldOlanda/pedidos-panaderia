import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PushSubscription } from './push-subscription.entity';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class PushSubscriptionsService {
  constructor(
    @InjectRepository(PushSubscription)
    private readonly subs: Repository<PushSubscription>,
  ) {}

  async subscribe(userId: string, dto: SubscribeDto): Promise<PushSubscription> {
    const existing = await this.subs.findOne({
      where: { endpoint: dto.endpoint },
    });
    if (existing) {
      if (existing.userId !== userId) {
        throw new ConflictException(
          'endpoint already registered to another user',
        );
      }
      existing.p256dh = dto.keys.p256dh;
      existing.auth = dto.keys.auth;
      return this.subs.save(existing);
    }
    const created = this.subs.create({
      userId,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
    });
    return this.subs.save(created);
  }

  async unsubscribe(userId: string, endpoint: string): Promise<boolean> {
    const result = await this.subs.delete({ userId, endpoint });
    return (result.affected ?? 0) > 0;
  }

  async listForUser(userId: string): Promise<PushSubscription[]> {
    return this.subs.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });
  }

  async findStale(
    sub: PushSubscription,
    errorStatusCode: number,
  ): Promise<boolean> {
    return errorStatusCode === 404 || errorStatusCode === 410;
  }

  async requireOwned(
    sub: PushSubscription,
    userId: string,
  ): Promise<PushSubscription> {
    if (!sub) {
      throw new NotFoundException('push subscription not found');
    }
    if (sub.userId !== userId) {
      throw new NotFoundException('push subscription not found');
    }
    return sub;
  }
}