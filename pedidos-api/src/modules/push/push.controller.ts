import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../auth/strategies/jwt.strategy';
import { PushSubscriptionsService } from './push-subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UnsubscribeDto } from './dto/unsubscribe.dto';

interface AuthedRequest extends Request {
  user: JwtUser;
}

interface PublicKeyDto {
  publicKey: string;
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
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  async subscribe(
    @Body() dto: SubscribeDto,
    @Req() req: AuthedRequest,
  ): Promise<{ id: string; endpoint: string }> {
    const sub = await this.subscriptions.subscribe(req.user.id, dto);
    return { id: sub.id, endpoint: sub.endpoint };
  }

  // DELETE bodies are unreliable across reverse proxies, CDNs and many HTTP
  // client libraries, so the endpoint is read from a query parameter.
  @Delete('unsubscribe')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async unsubscribe(
    @Query() query: UnsubscribeDto,
    @Req() req: AuthedRequest,
  ): Promise<{ removed: boolean }> {
    const removed = await this.subscriptions.unsubscribe(
      req.user.id,
      query.endpoint,
    );
    return { removed };
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async mine(@Req() req: AuthedRequest) {
    return this.subscriptions.listForUser(req.user.id);
  }
}