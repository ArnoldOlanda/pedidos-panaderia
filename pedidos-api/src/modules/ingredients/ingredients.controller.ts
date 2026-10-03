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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { Ingredient } from './ingredient.entity';
import { AllowedUnitPair } from './ingredient-units';
import { IngredientsService } from './ingredients.service';

@Controller('ingredients')
export class IngredientsController {
  constructor(private readonly service: IngredientsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(): Promise<Ingredient[]> {
    return this.service.list();
  }

  // Declared before GET /:id so "units" is not captured by the param route.
  @Get('units')
  @UseGuards(JwtAuthGuard)
  listAllowedUnitPairs(): readonly AllowedUnitPair[] {
    return this.service.listAllowedUnitPairs();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id', new ParseUUIDPipe()) id: string): Promise<Ingredient> {
    return this.service.findOne(id);
  }

  @Post()
  @HttpCode(201)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEDOR')
  create(@Body() dto: CreateIngredientDto): Promise<Ingredient> {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEDOR')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateIngredientDto,
  ): Promise<Ingredient> {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEDOR')
  remove(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    return this.service.remove(id);
  }
}
