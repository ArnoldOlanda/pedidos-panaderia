import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { ByDniQueryDto } from './dto/by-dni.query.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Order } from './order.entity';

interface AuthedRequest extends Request {
  user: JwtUser;
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateOrderDto): Promise<Order> {
    return this.orders.create(dto);
  }

  @Get()
  async byDni(@Query() query: ByDniQueryDto): Promise<Order[]> {
    return this.orders.listByDni(query.dni);
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