import {
  Body,
  Controller,
  Delete,
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
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
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

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEDOR')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateRecipeDto,
    @Req() req: AuthedRequest,
  ): Promise<Recipe> {
    return this.service.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEDOR')
  remove(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthedRequest,
  ): Promise<void> {
    return this.service.remove(id, req.user.id);
  }
}