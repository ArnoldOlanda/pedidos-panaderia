import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PushSubscriptionsService } from './push-subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UnsubscribeDto } from './dto/unsubscribe.dto';
import { PublicKeyDto } from './dto/public-key.dto';

const DEVICE_HEADER = 'x-device-id';

function requireDeviceId(value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new BadRequestException('X-Device-Id header is required');
  }
  return value;
}

@Controller('push')
export class PushController {
  constructor(
    private readonly subscriptions: PushSubscriptionsService,
    private readonly config: ConfigService,
  ) {}

  // Public endpoint: lets the browser fetch the VAPID public key before the
  // user is authenticated. The key is non-secret by design. A missing key
  // surfaces a 404 (not a 500) so unauthenticated probes do not crash the
  // process.
  @Get('public-key')
  @HttpCode(200)
  async publicKey(): Promise<PublicKeyDto> {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    if (!publicKey) {
      throw new NotFoundException('VAPID public key not configured');
    }
    return { publicKey };
  }

  @Post('subscribe')
  @HttpCode(201)
  async subscribe(
    @Body() dto: SubscribeDto,
  ): Promise<{ id: string; endpoint: string }> {
    const owner = requireDeviceId(dto.deviceId);
    const sub = await this.subscriptions.subscribe(owner, dto);
    return { id: sub.id, endpoint: sub.endpoint };
  }

  // DELETE bodies are unreliable across reverse proxies, CDNs and many HTTP
  // client libraries, so the endpoint is read from a query parameter.
  @Delete('unsubscribe')
  @HttpCode(200)
  async unsubscribe(
    @Query() query: UnsubscribeDto,
    @Headers(DEVICE_HEADER) deviceId: string | undefined,
  ): Promise<{ removed: boolean }> {
    const owner = requireDeviceId(deviceId);
    const removed = await this.subscriptions.unsubscribe(owner, query.endpoint);
    return { removed };
  }

  @Get('mine')
  async mine(@Headers(DEVICE_HEADER) deviceId: string | undefined) {
    const owner = requireDeviceId(deviceId);
    return this.subscriptions.listForDevice(owner);
  }
}