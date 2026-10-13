import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUser } from '../auth/strategies/jwt.strategy';
import { ProductsService } from './products.service';
import type { VendorTodayProduct } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './product.entity';

interface AuthedRequest extends Request {
  user: JwtUser;
}

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get('today')
  listToday(): Promise<unknown[]> {
    return this.service.listTodayPublic();
  }

  @Get('today/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEDOR')
  listTodayAll(): Promise<VendorTodayProduct[]> {
    return this.service.listTodayAll();
  }

  @Get('mine/today')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEDOR')
  listMineToday(@Req() req: AuthedRequest): Promise<unknown[]> {
    return this.service.listMineToday(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<unknown> {
    return this.service.findOnePublic(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEDOR')
  @HttpCode(201)
  create(
    @Body() dto: CreateProductDto,
    @Req() req: AuthedRequest,
  ): Promise<Product> {
    return this.service.create(dto, req.user.id);
  }
}