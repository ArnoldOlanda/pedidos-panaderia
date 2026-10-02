import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe, RecipeIngredient } from './recipe.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

interface CostBreakdown {
  costoInsumos: number;
  igv: number;
  manoObra: number;
  costoProd: number;
  precioVenta: number;
}

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe) private readonly repo: Repository<Recipe>,
  ) {}

  private calculate(
    ingredients: Pick<RecipeIngredient, 'cantidadGr' | 'precioKg'>[],
    utilidad: number,
  ): CostBreakdown {
    const costoInsumos = ingredients.reduce(
      (sum, i) => sum + (i.cantidadGr / 1000) * i.precioKg,
      0,
    );
    const igv = costoInsumos * 0.18;
    const manoObra = costoInsumos * 0.2;
    const costoProd = costoInsumos + igv + manoObra;
    const precioVenta = costoProd * (1 + utilidad / 100);
    return { costoInsumos, igv, manoObra, costoProd, precioVenta };
  }

  async create(dto: CreateRecipeDto, createdById: string): Promise<Recipe> {
    const utilidad = dto.utilidad ?? 35;
    const { costoProd, precioVenta } = this.calculate(
      dto.ingredients,
      utilidad,
    );
    const recipe = this.repo.create({
      name: dto.name,
      ingredients: dto.ingredients as RecipeIngredient[],
      utilidad,
      totalCost: costoProd,
      suggestedPrice: precioVenta,
      createdById,
    });
    return this.repo.save(recipe);
  }

  async update(
    id: string,
    vendorId: string,
    dto: UpdateRecipeDto,
  ): Promise<Recipe> {
    const recipe = await this.findOne(id);
    if (recipe.createdById !== vendorId) {
      throw new ForbiddenException('only the creator can edit this recipe');
    }
    // Short-circuit recalc when neither ingredients nor utilidad change:
    // a pure name update must preserve the persisted cost + suggested price
    // (avoids float drift from re-running calculate on identical inputs).
    if (dto.ingredients === undefined && dto.utilidad === undefined) {
      if (dto.name !== undefined) {
        recipe.name = dto.name;
      }
      return this.repo.save(recipe);
    }
    const mergedIngredients = (dto.ingredients ??
      recipe.ingredients) as RecipeIngredient[];
    const mergedUtilidad = dto.utilidad ?? recipe.utilidad;
    const { costoProd, precioVenta } = this.calculate(
      mergedIngredients,
      mergedUtilidad,
    );
    recipe.name = dto.name ?? recipe.name;
    recipe.ingredients = mergedIngredients;
    recipe.utilidad = mergedUtilidad;
    recipe.totalCost = costoProd;
    recipe.suggestedPrice = precioVenta;
    return this.repo.save(recipe);
  }

  async remove(id: string, vendorId: string): Promise<void> {
    const recipe = await this.findOne(id);
    if (recipe.createdById !== vendorId) {
      throw new ForbiddenException('only the creator can delete this recipe');
    }
    await this.repo.delete(id);
  }

  async list(): Promise<Recipe[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Recipe> {
    const recipe = await this.repo.findOne({ where: { id } });
    if (!recipe) {
      throw new NotFoundException(`recipe ${id} not found`);
    }
    return recipe;
  }
}