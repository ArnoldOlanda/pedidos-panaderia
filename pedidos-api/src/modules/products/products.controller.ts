import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUser } from '../auth/strategies/jwt.strategy';
import { ProductsService } from './products.service';

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
}