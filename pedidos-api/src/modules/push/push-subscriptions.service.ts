import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { PushSubscription } from './push-subscription.entity';
import { SubscribeDto } from './dto/subscribe.dto';

@Injectable()
export class PushSubscriptionsService {
  constructor(
    @InjectRepository(PushSubscription)
    private readonly subs: Repository<PushSubscription>,
  ) {}

  // Postgres SQLSTATE for unique_violation. The endpoint column has a UNIQUE
  // index, so two concurrent subscribers for the same endpoint can both pass
  // the existence check below; the second save() then surfaces this code.
  private static readonly PG_UNIQUE_VIOLATION = '23505';

  private isUniqueEndpointViolation(err: unknown): boolean {
    if (!(err instanceof QueryFailedError)) return false;
    const driverCode = (err as unknown as { driverError?: { code?: string } })
      .driverError?.code;
    return driverCode === PushSubscriptionsService.PG_UNIQUE_VIOLATION;
  }

  async subscribe(deviceId: string, dto: SubscribeDto): Promise<PushSubscription> {
    const existing = await this.subs.findOne({
      where: { endpoint: dto.endpoint },
    });
    if (existing) {
      if (existing.deviceId !== deviceId) {
        throw new ConflictException(
          'endpoint already registered to another device',
        );
      }
      existing.p256dh = dto.keys.p256dh;
      existing.auth = dto.keys.auth;
      try {
        return await this.subs.save(existing);
      } catch (err) {
        // Race: another writer beat us to the unique-index slot. Surface as
        // a domain conflict rather than a 500.
        if (this.isUniqueEndpointViolation(err)) {
          throw new ConflictException(
            'endpoint already registered to another device',
          );
        }
        throw err;
      }
    }
    const created = this.subs.create({
      deviceId,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
    });
    try {
      return await this.subs.save(created);
    } catch (err) {
      // Race: a concurrent subscribe inserted the same endpoint between our
      // findOne() and save(). The other writer owns the row, which is a
      // conflict from this caller's perspective.
      if (this.isUniqueEndpointViolation(err)) {
        throw new ConflictException(
          'endpoint already registered to another device',
        );
      }
      throw err;
    }
  }

  async unsubscribe(deviceId: string, endpoint: string): Promise<boolean> {
    const result = await this.subs.delete({ deviceId, endpoint });
    return (result.affected ?? 0) > 0;
  }

  async listForDevice(deviceId: string): Promise<PushSubscription[]> {
    return this.subs.find({
      where: { deviceId },
      order: { updatedAt: 'DESC' },
    });
  }

  async findStale(
    sub: PushSubscription,
    errorStatusCode: number,
  ): Promise<boolean> {
    return errorStatusCode === 404 || errorStatusCode === 410;
  }

  async requireOwnedByDevice(
    sub: PushSubscription,
    deviceId: string,
  ): Promise<PushSubscription> {
    if (!sub) {
      throw new NotFoundException('push subscription not found');
    }
    if (sub.deviceId !== deviceId) {
      throw new NotFoundException('push subscription not found');
    }
    return sub;
  }
}