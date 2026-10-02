import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../auth/strategies/jwt.strategy';
import { PushSubscriptionsService } from './push-subscriptions.service';
import { SubscribeDto } from './dto/subscribe.dto';
import { UnsubscribeDto } from './dto/unsubscribe.dto';

interface AuthedRequest extends Request {
  user: JwtUser;
}

@Controller('push')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(
    private readonly subscriptions: PushSubscriptionsService,
  ) {}

  @Post('subscribe')
  @HttpCode(201)
  async subscribe(
    @Body() dto: SubscribeDto,
    @Req() req: AuthedRequest,
  ): Promise<{ id: string; endpoint: string }> {
    const sub = await this.subscriptions.subscribe(req.user.id, dto);
    return { id: sub.id, endpoint: sub.endpoint };
  }

  @Delete('unsubscribe')
  @HttpCode(200)
  async unsubscribe(
    @Body() dto: UnsubscribeDto,
    @Req() req: AuthedRequest,
  ): Promise<{ removed: boolean }> {
    const removed = await this.subscriptions.unsubscribe(
      req.user.id,
      dto.endpoint,
    );
    return { removed };
  }

  @Get('mine')
  async mine(@Req() req: AuthedRequest) {
    return this.subscriptions.listForUser(req.user.id);
  }
}