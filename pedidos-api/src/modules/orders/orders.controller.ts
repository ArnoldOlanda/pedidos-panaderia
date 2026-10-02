import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
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

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async mine(@Req() req: AuthedRequest): Promise<Order[]> {
    return this.orders.listMine(req.user.id);
  }

  @Get('by-product/:productId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEDOR')
  async byProduct(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Req() req: AuthedRequest,
  ): Promise<Order[]> {
    return this.orders.listByProduct(productId, req.user.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEDOR')
  @HttpCode(200)
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: AuthedRequest,
  ): Promise<Order> {
    return this.orders.updateStatus(id, dto.status, req.user.id);
  }
}