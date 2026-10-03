import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Ingredient } from '../ingredients/ingredient.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { Recipe } from './recipe.entity';
import { CreateRecipeDto, RecipeIngredientDto } from './dto/create-recipe.dto';
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
    @InjectRepository(Ingredient)
    private readonly ingredientsRepo: Repository<Ingredient>,
  ) {}

  private calculate(
    lines: RecipeIngredientDto[],
    ingredientsById: Map<string, Ingredient>,
    utilidad: number,
  ): CostBreakdown {
    const costoInsumos = lines.reduce((sum, line) => {
      const ingredient = ingredientsById.get(line.ingredientId);
      if (!ingredient) {
        throw new BadRequestException(
          `ingrediente ${line.ingredientId} no encontrado`,
        );
      }
      const unitCost = ingredient.purchasePrice / ingredient.conversionFactor;
      return sum + line.quantityUsed * unitCost;
    }, 0);
    const igv = costoInsumos * 0.18;
    const manoObra = costoInsumos * 0.2;
    const costoProd = costoInsumos + igv + manoObra;
    const precioVenta = costoProd * (1 + utilidad / 100);
    return { costoInsumos, igv, manoObra, costoProd, precioVenta };
  }

  // Resolves every referenced ingredient in one query and fails with a single
  // BadRequestException that names all missing ids, so a raw FK violation never
  // escapes to the caller.
  private async resolveIngredients(
    lines: { ingredientId: string }[],
  ): Promise<Map<string, Ingredient>> {
    const ids = [...new Set(lines.map((line) => line.ingredientId))];
    const found = await this.ingredientsRepo.find({ where: { id: In(ids) } });
    const byId = new Map(found.map((ingredient) => [ingredient.id, ingredient]));
    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new BadRequestException(
        `ingredientes no encontrados: ${missing.join(', ')}`,
      );
    }
    return byId;
  }

  // A recipe must reference each insumo at most once: two rows for the same
  // ingredient would double-count it. Reject the payload before it reaches the
  // database, where a unique constraint backs the same rule.
  private assertNoDuplicateIngredients(lines: RecipeIngredientDto[]): void {
    const seen = new Set<string>();
    for (const line of lines) {
      if (seen.has(line.ingredientId)) {
        throw new BadRequestException('insumo repetido en la receta');
      }
      seen.add(line.ingredientId);
    }
  }

  private buildLines(
    lines: RecipeIngredientDto[],
    ingredientsById: Map<string, Ingredient>,
  ): RecipeIngredient[] {
    return lines.map((line, position) => {
      const recipeIngredient = new RecipeIngredient();
      recipeIngredient.ingredientId = line.ingredientId;
      recipeIngredient.quantityUsed = line.quantityUsed;
      recipeIngredient.position = position;
      const ingredient = ingredientsById.get(line.ingredientId);
      if (ingredient) {
        recipeIngredient.ingredient = ingredient;
      }
      return recipeIngredient;
    });
  }

  // The lines live in a table, so order is sorted by `position` in JS to
  // guarantee a deterministic result regardless of the driver's row order.
  private sortByPosition(recipe: Recipe): Recipe {
    if (recipe.ingredients) {
      recipe.ingredients.sort((a, b) => a.position - b.position);
    }
    return recipe;
  }

  async create(dto: CreateRecipeDto, createdById: string): Promise<Recipe> {
    this.assertNoDuplicateIngredients(dto.ingredients);
    const utilidad = dto.utilidad ?? 35;
    const ingredientsById = await this.resolveIngredients(dto.ingredients);
    const { costoProd, precioVenta } = this.calculate(
      dto.ingredients,
      ingredientsById,
      utilidad,
    );
    const recipe = this.repo.create({
      name: dto.name,
      utilidad,
      totalCost: costoProd,
      suggestedPrice: precioVenta,
      createdById,
      ingredients: this.buildLines(dto.ingredients, ingredientsById),
    });
    // Atomic write: the recipe and all of its lines commit together or not at all.
    return this.repo.manager.transaction(async (manager) => {
      return manager.save(recipe);
    });
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
    // @IsOptional() also skips validation for null, so a null optional field
    // reaches the service at runtime even though the DTO types say otherwise.
    // Normalize every optional field so null always means "not provided": it
    // must never be persisted as a value nor force a silent cost recomputation.
    const name = dto.name ?? undefined;
    const newLines = dto.ingredients ?? undefined;
    const utilidad = dto.utilidad ?? undefined;
    // Short-circuit recalc when neither ingredients nor utilidad change:
    // a pure name update must preserve the persisted cost + suggested price
    // (avoids float drift from re-running calculate on identical inputs).
    if (newLines === undefined && utilidad === undefined) {
      if (name !== undefined) {
        recipe.name = name;
      }
      return this.repo.save(recipe);
    }
    if (newLines !== undefined) {
      this.assertNoDuplicateIngredients(newLines);
    }
    const effectiveLines: RecipeIngredientDto[] = newLines
      ? newLines
      : recipe.ingredients.map((line) => ({
          ingredientId: line.ingredientId,
          quantityUsed: line.quantityUsed,
        }));
    const ingredientsById = await this.resolveIngredients(effectiveLines);
    const mergedUtilidad = utilidad ?? recipe.utilidad;
    const { costoProd, precioVenta } = this.calculate(
      effectiveLines,
      ingredientsById,
      mergedUtilidad,
    );
    recipe.name = name ?? recipe.name;
    recipe.utilidad = mergedUtilidad;
    recipe.totalCost = costoProd;
    recipe.suggestedPrice = precioVenta;
    if (newLines === undefined) {
      return this.repo.save(recipe);
    }
    // Replace the whole line set inside one transaction: delete the previous
    // rows first, then insert the new ones with fresh positions. No orphan
    // rows can survive a partial failure.
    return this.repo.manager.transaction(async (manager) => {
      await manager.delete(RecipeIngredient, { recipeId: recipe.id });
      recipe.ingredients = this.buildLines(newLines, ingredientsById);
      return manager.save(recipe);
    });
  }

  async remove(id: string, vendorId: string): Promise<void> {
    const recipe = await this.findOne(id);
    if (recipe.createdById !== vendorId) {
      throw new ForbiddenException('only the creator can delete this recipe');
    }
    await this.repo.delete(id);
  }

  async list(): Promise<Recipe[]> {
    const recipes = await this.repo.find({
      relations: { ingredients: { ingredient: true } },
      order: { createdAt: 'DESC' },
    });
    return recipes.map((recipe) => this.sortByPosition(recipe));
  }

  async findOne(id: string): Promise<Recipe> {
    const recipe = await this.repo.findOne({
      where: { id },
      relations: { ingredients: { ingredient: true } },
    });
    if (!recipe) {
      throw new NotFoundException(`recipe ${id} not found`);
    }
    return this.sortByPosition(recipe);
  }
}
