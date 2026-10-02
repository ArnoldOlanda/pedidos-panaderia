import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUser } from '../auth/strategies/jwt.strategy';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './order.entity';

interface AuthedRequest extends Request {
  user: JwtUser;
}

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @Roles('COMPRADOR')
  @HttpCode(201)
  async create(
    @Body() dto: CreateOrderDto,
    @Req() req: AuthedRequest,
  ): Promise<Order> {
    return this.orders.create(dto, req.user.id);
  }
}