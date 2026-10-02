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
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { Recipe } from './recipe.entity';
import { RecipesService } from './recipes.service';

interface AuthedRequest extends Request {
  user: JwtUser;
}

@Controller('recipes')
export class RecipesController {
  constructor(private readonly service: RecipesService) {}

  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEDOR')
  create(
    @Body() dto: CreateRecipeDto,
    @Req() req: AuthedRequest,
  ): Promise<Recipe> {
    return this.service.create(dto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(): Promise<Recipe[]> {
    return this.service.list();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<Recipe> {
    return this.service.findOne(id);
  }
}
