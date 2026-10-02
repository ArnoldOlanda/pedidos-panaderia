import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe, RecipeIngredient } from './recipe.entity';
import { CreateRecipeDto } from './dto/create-recipe.dto';

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
