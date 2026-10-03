import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RecipesService } from './recipes.service';
import { RecipeIngredient } from './recipe-ingredient.entity';
import { Ingredient, IngredientUnit } from '../ingredients/ingredient.entity';
import type { Recipe } from './recipe.entity';
import type { UpdateRecipeDto } from './dto/update-recipe.dto';

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  getRepositoryToken: () => 'RECIPES_REPO',
}));

const VENDOR_A = '11111111-1111-1111-1111-111111111111';
const VENDOR_B = '22222222-2222-2222-2222-222222222222';
const RECIPE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const LINE_A = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const LINE_B = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const HARINA_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const AZUCAR_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
const HUEVO_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const ingredient = (overrides: Partial<Ingredient> = {}): Ingredient => ({
  id: HARINA_ID,
  name: 'Harina',
  usageUnit: IngredientUnit.G,
  purchaseUnit: IngredientUnit.KG,
  conversionFactor: 1000,
  purchasePrice: 5,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const recipeLine = (
  overrides: Partial<RecipeIngredient> = {},
): RecipeIngredient => ({
  id: LINE_A,
  recipeId: RECIPE_ID,
  ingredientId: HARINA_ID,
  quantityUsed: 1000,
  position: 0,
  ingredient: ingredient(),
  recipe: undefined as unknown as Recipe,
  ...overrides,
});

// costoInsumos=5, igv=0.9, manoObra=1 → costoProd=6.9 → 6.9 * 1.35 = 9.315
const baseRecipe = (overrides: Partial<Recipe> = {}): Recipe =>
  ({
    id: RECIPE_ID,
    name: 'Pan de yema',
    ingredients: [recipeLine()],
    utilidad: 35,
    manoObra: 20,
    totalCost: 6.9,
    suggestedPrice: 9.315,
    createdById: VENDOR_A,
    createdBy: undefined,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }) as Recipe;

describe('RecipesService', () => {
  let svc: RecipesService;
  const manager = {
    save: jest.fn(),
    delete: jest.fn(),
  };
  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };
  const ingredientsRepo = {
    find: jest.fn(),
  };

  beforeEach(() => {
    repo.create.mockReset();
    repo.save.mockReset();
    repo.find.mockReset();
    repo.findOne.mockReset();
    repo.delete.mockReset();
    repo.manager.transaction.mockReset();
    ingredientsRepo.find.mockReset();
    manager.save.mockReset();
    manager.delete.mockReset();
    repo.manager.transaction.mockImplementation(async (cb: (m: any) => any) =>
      cb(manager),
    );
    svc = new RecipesService(repo as any, ingredientsRepo as any);
  });

  describe('create', () => {
    it('persists createdById and recalculates totalCost + suggestedPrice', async () => {
      ingredientsRepo.find.mockResolvedValue([ingredient()]);
      repo.create.mockImplementation((input) => input);
      manager.save.mockImplementation(async (r) => r);

      const dto = {
        name: 'Pan de yema',
        ingredients: [{ ingredientId: HARINA_ID, quantityUsed: 1000 }],
      };

      const result = await svc.create(dto, VENDOR_A);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Pan de yema',
          utilidad: 100,
          manoObra: 20,
          createdById: VENDOR_A,
          ingredients: [
            expect.objectContaining({
              ingredientId: HARINA_ID,
              quantityUsed: 1000,
              position: 0,
            }),
          ],
        }),
      );
      expect(manager.save).toHaveBeenCalledTimes(1);
      // costoInsumos=5, igv=0.9, manoObra=5*0.2=1 → costoProd=6.9
      // default utilidad=100 → 6.9 * 2 = 13.8
      expect(result.totalCost).toBeCloseTo(6.9, 5);
      expect(result.suggestedPrice).toBeCloseTo(13.8, 5);
    });

    it('rejects an unknown ingredientId with BadRequestException', async () => {
      ingredientsRepo.find.mockResolvedValue([]);

      await expect(
        svc.create(
          {
            name: 'Pan',
            ingredients: [{ ingredientId: HARINA_ID, quantityUsed: 1000 }],
          },
          VENDOR_A,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repo.create).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });

    it('uses conversionFactor 1 with a per-unit purchase price (UNIT -> UNIT)', async () => {
      // Eggs are bought and used per unit: purchaseUnit === usageUnit === UNIT
      // and conversionFactor === 1, so the divisor must not be hardcoded to 1000.
      ingredientsRepo.find.mockResolvedValue([
        ingredient({
          id: HUEVO_ID,
          name: 'Huevo',
          usageUnit: IngredientUnit.UNIT,
          purchaseUnit: IngredientUnit.UNIT,
          conversionFactor: 1,
          purchasePrice: 0.5,
        }),
      ]);
      repo.create.mockImplementation((input) => input);
      manager.save.mockImplementation(async (r) => r);

      const result = await svc.create(
        {
          name: 'Torta',
          ingredients: [{ ingredientId: HUEVO_ID, quantityUsed: 6 }],
        },
        VENDOR_A,
      );

      // unitCost = 0.5 / 1 = 0.5
      // costoInsumos = 6 * 0.5 = 3, igv = 3 * 0.18 = 0.54, manoObra = 3 * 0.2 = 0.6
      // costoProd = 3 + 0.54 + 0.6 = 4.14, default utilidad=100 → 4.14 * 2 = 8.28
      expect(result.totalCost).toBeCloseTo(4.14, 5);
      expect(result.suggestedPrice).toBeCloseTo(8.28, 5);
    });

    it('uses an explicit manoObra percentage and the utilidad default', async () => {
      ingredientsRepo.find.mockResolvedValue([ingredient()]);
      repo.create.mockImplementation((input) => input);
      manager.save.mockImplementation(async (r) => r);

      const result = await svc.create(
        {
          name: 'Pan con mano de obra alta',
          ingredients: [{ ingredientId: HARINA_ID, quantityUsed: 1000 }],
          manoObra: 50,
        },
        VENDOR_A,
      );

      // costoInsumos=5, igv=0.9, manoObra=5*0.5=2.5 → costoProd=8.4
      // default utilidad=100 → 8.4 * 2 = 16.8
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ manoObra: 50 }),
      );
      expect(result.totalCost).toBeCloseTo(8.4, 5);
      expect(result.suggestedPrice).toBeCloseTo(16.8, 5);
    });

    it('treats manoObra 0 as a real 0% and never falls back to the default', async () => {
      ingredientsRepo.find.mockResolvedValue([ingredient()]);
      repo.create.mockImplementation((input) => input);
      manager.save.mockImplementation(async (r) => r);

      const result = await svc.create(
        {
          name: 'Pan sin mano de obra',
          ingredients: [{ ingredientId: HARINA_ID, quantityUsed: 1000 }],
          manoObra: 0,
        },
        VENDOR_A,
      );

      // costoInsumos=5, igv=0.9, manoObra=5*0=0 → costoProd=5*1.18=5.9
      // default utilidad=100 → 5.9 * 2 = 11.8
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ manoObra: 0 }),
      );
      expect(result.totalCost).toBeCloseTo(5.9, 5);
      expect(result.suggestedPrice).toBeCloseTo(11.8, 5);
    });

    it('rejects a repeated ingredientId on create with BadRequestException', async () => {
      await expect(
        svc.create(
          {
            name: 'Pan',
            ingredients: [
              { ingredientId: HARINA_ID, quantityUsed: 500 },
              { ingredientId: HARINA_ID, quantityUsed: 500 },
            ],
          },
          VENDOR_A,
        ),
      ).rejects.toThrow('insumo repetido en la receta');

      expect(ingredientsRepo.find).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates fields and recalculates totalCost/suggestedPrice for the creator', async () => {
      repo.findOne.mockResolvedValue(baseRecipe());
      ingredientsRepo.find.mockResolvedValue([ingredient({ purchasePrice: 10 })]);
      manager.save.mockImplementation(async (r) => r);

      const result = await svc.update(RECIPE_ID, VENDOR_A, {
        name: 'Pan especial',
        ingredients: [{ ingredientId: HARINA_ID, quantityUsed: 1000 }],
        utilidad: 50,
      });

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: RECIPE_ID },
        relations: { ingredients: { ingredient: true } },
      });
      // costoInsumos=10, igv=1.8, manoObra=2 → costoProd=13.8 → 13.8 * 1.5 = 20.7
      expect(result.name).toBe('Pan especial');
      expect(result.utilidad).toBe(50);
      expect(result.totalCost).toBeCloseTo(13.8, 5);
      expect(result.suggestedPrice).toBeCloseTo(20.7, 5);
      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0]).toMatchObject({
        ingredientId: HARINA_ID,
        quantityUsed: 1000,
        position: 0,
      });
    });

    it('replaces the lines, deletes the previous rows and assigns fresh positions', async () => {
      const existing = baseRecipe({
        ingredients: [
          recipeLine({ id: LINE_A, position: 0 }),
          recipeLine({
            id: LINE_B,
            ingredientId: AZUCAR_ID,
            position: 1,
          }),
        ],
      });
      repo.findOne.mockResolvedValue(existing);
      ingredientsRepo.find.mockResolvedValue([
        ingredient(),
        ingredient({ id: AZUCAR_ID, name: 'Azúcar', purchasePrice: 4 }),
      ]);
      manager.save.mockImplementation(async (r) => r);

      const result = await svc.update(RECIPE_ID, VENDOR_A, {
        ingredients: [{ ingredientId: HARINA_ID, quantityUsed: 500 }],
      });

      expect(manager.delete).toHaveBeenCalledWith(RecipeIngredient, {
        recipeId: RECIPE_ID,
      });
      // Both previous rows are gone and only the single new line survives.
      expect(result.ingredients).toHaveLength(1);
      expect(result.ingredients[0]).toMatchObject({
        ingredientId: HARINA_ID,
        quantityUsed: 500,
        position: 0,
      });
      expect(result.ingredients.some((l) => l.id === LINE_A)).toBe(false);
      expect(result.ingredients.some((l) => l.id === LINE_B)).toBe(false);
      // The delete runs before the new lines are persisted.
      expect(manager.delete.mock.invocationCallOrder[0]).toBeLessThan(
        manager.save.mock.invocationCallOrder[0],
      );
    });

    it('assigns fresh 0-based positions to the new lines', async () => {
      repo.findOne.mockResolvedValue(baseRecipe());
      ingredientsRepo.find.mockResolvedValue([
        ingredient(),
        ingredient({ id: AZUCAR_ID, name: 'Azúcar', purchasePrice: 4 }),
      ]);
      manager.save.mockImplementation(async (r) => r);

      const result = await svc.update(RECIPE_ID, VENDOR_A, {
        ingredients: [
          { ingredientId: AZUCAR_ID, quantityUsed: 250 },
          { ingredientId: HARINA_ID, quantityUsed: 1000 },
        ],
      });

      expect(result.ingredients.map((l) => l.position)).toEqual([0, 1]);
      expect(result.ingredients.map((l) => l.ingredientId)).toEqual([
        AZUCAR_ID,
        HARINA_ID,
      ]);
    });

    it('rejects an unknown ingredientId on update with BadRequestException', async () => {
      repo.findOne.mockResolvedValue(baseRecipe());
      ingredientsRepo.find.mockResolvedValue([]);

      await expect(
        svc.update(RECIPE_ID, VENDOR_A, {
          ingredients: [{ ingredientId: AZUCAR_ID, quantityUsed: 500 }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(manager.delete).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('preserves totalCost/suggestedPrice when only name changes', async () => {
      const existing = baseRecipe();
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (r) => r);

      const result = await svc.update(RECIPE_ID, VENDOR_A, {
        name: 'Pan renombrado',
      });

      expect(result.name).toBe('Pan renombrado');
      expect(result.totalCost).toBe(existing.totalCost);
      expect(result.suggestedPrice).toBe(existing.suggestedPrice);
      expect(result.utilidad).toBe(existing.utilidad);
      expect(ingredientsRepo.find).not.toHaveBeenCalled();
      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });

    it('treats a null ingredients field as not provided and does not throw', async () => {
      const existing = baseRecipe();
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (r) => r);

      const result = await svc.update(RECIPE_ID, VENDOR_A, {
        ingredients: null,
      } as unknown as UpdateRecipeDto);

      expect(result.totalCost).toBe(existing.totalCost);
      expect(result.suggestedPrice).toBe(existing.suggestedPrice);
      expect(ingredientsRepo.find).not.toHaveBeenCalled();
      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });

    it('preserves the persisted cost snapshot when utilidad is null and catalog prices changed', async () => {
      const existing = baseRecipe({
        totalCost: 6.9,
        suggestedPrice: 9.315,
        utilidad: 35,
      });
      repo.findOne.mockResolvedValue(existing);
      // The catalog price moved after the recipe was priced; a null utilidad
      // patch must not silently re-price the existing recipe (invariant D3).
      ingredientsRepo.find.mockResolvedValue([
        ingredient({ purchasePrice: 99 }),
      ]);
      repo.save.mockImplementation(async (r) => r);

      const result = await svc.update(RECIPE_ID, VENDOR_A, {
        utilidad: null,
      } as unknown as UpdateRecipeDto);

      expect(result.totalCost).toBe(6.9);
      expect(result.suggestedPrice).toBe(9.315);
      expect(result.utilidad).toBe(35);
      expect(ingredientsRepo.find).not.toHaveBeenCalled();
      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });

    it('preserves the persisted cost snapshot when manoObra is null and catalog prices changed', async () => {
      const existing = baseRecipe({
        totalCost: 6.9,
        suggestedPrice: 9.315,
        manoObra: 20,
      });
      repo.findOne.mockResolvedValue(existing);
      // A null manoObra patch must not silently re-price the existing recipe.
      ingredientsRepo.find.mockResolvedValue([
        ingredient({ purchasePrice: 99 }),
      ]);
      repo.save.mockImplementation(async (r) => r);

      const result = await svc.update(RECIPE_ID, VENDOR_A, {
        manoObra: null,
      } as unknown as UpdateRecipeDto);

      expect(result.totalCost).toBe(6.9);
      expect(result.suggestedPrice).toBe(9.315);
      expect(result.manoObra).toBe(20);
      expect(ingredientsRepo.find).not.toHaveBeenCalled();
      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });

    it('recalculates the persisted cost when manoObra changes', async () => {
      repo.findOne.mockResolvedValue(baseRecipe());
      ingredientsRepo.find.mockResolvedValue([ingredient()]);
      repo.save.mockImplementation(async (r) => r);

      const result = await svc.update(RECIPE_ID, VENDOR_A, {
        manoObra: 50,
      });

      // costoInsumos=5, igv=0.9, manoObra=5*0.5=2.5 → costoProd=8.4
      // merged utilidad=35 → 8.4 * 1.35 = 11.34
      expect(result.manoObra).toBe(50);
      expect(result.totalCost).toBeCloseTo(8.4, 5);
      expect(result.suggestedPrice).toBeCloseTo(11.34, 5);
    });

    it('preserves the snapshot on a name-only update for a manoObra 50 recipe', async () => {
      const existing = baseRecipe({
        name: 'Pan de yema',
        manoObra: 50,
        totalCost: 8.4,
        suggestedPrice: 11.34,
      });
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (r) => r);

      const result = await svc.update(RECIPE_ID, VENDOR_A, {
        name: 'Pan renombrado',
      });

      expect(result.name).toBe('Pan renombrado');
      expect(result.manoObra).toBe(50);
      expect(result.totalCost).toBe(8.4);
      expect(result.suggestedPrice).toBe(11.34);
      expect(ingredientsRepo.find).not.toHaveBeenCalled();
      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });

    it('rejects a repeated ingredientId on update with BadRequestException', async () => {
      repo.findOne.mockResolvedValue(baseRecipe());

      await expect(
        svc.update(RECIPE_ID, VENDOR_A, {
          ingredients: [
            { ingredientId: HARINA_ID, quantityUsed: 500 },
            { ingredientId: HARINA_ID, quantityUsed: 250 },
          ],
        }),
      ).rejects.toThrow('insumo repetido en la receta');

      expect(ingredientsRepo.find).not.toHaveBeenCalled();
      expect(manager.delete).not.toHaveBeenCalled();
      expect(manager.save).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when a different vendor tries to update', async () => {
      repo.findOne.mockResolvedValue(baseRecipe());

      await expect(
        svc.update(RECIPE_ID, VENDOR_B, { name: 'hack' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(repo.save).not.toHaveBeenCalled();
      expect(repo.manager.transaction).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the recipe does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        svc.update('00000000-0000-0000-0000-000000000000', VENDOR_A, {
          name: 'x',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the recipe for the creator', async () => {
      repo.findOne.mockResolvedValue(baseRecipe());
      repo.delete.mockResolvedValue({ affected: 1 });

      await expect(svc.remove(RECIPE_ID, VENDOR_A)).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledWith(RECIPE_ID);
    });

    it('throws ForbiddenException when a different vendor tries to delete', async () => {
      repo.findOne.mockResolvedValue(baseRecipe());

      await expect(svc.remove(RECIPE_ID, VENDOR_B)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the recipe does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        svc.remove('00000000-0000-0000-0000-000000000000', VENDOR_A),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('returns the recipe when present', async () => {
      repo.findOne.mockResolvedValue(baseRecipe());
      await expect(svc.findOne(RECIPE_ID)).resolves.toMatchObject({
        id: RECIPE_ID,
      });
    });

    it('loads the ingredient relation', async () => {
      repo.findOne.mockResolvedValue(baseRecipe());

      await svc.findOne(RECIPE_ID);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: RECIPE_ID },
        relations: { ingredients: { ingredient: true } },
      });
    });

    it('returns the lines ordered by position', async () => {
      repo.findOne.mockResolvedValue(
        baseRecipe({
          ingredients: [
            recipeLine({ id: LINE_B, position: 1 }),
            recipeLine({ id: LINE_A, position: 0 }),
          ],
        }),
      );

      const result = await svc.findOne(RECIPE_ID);

      expect(result.ingredients.map((line) => line.position)).toEqual([0, 1]);
      expect(result.ingredients.map((line) => line.id)).toEqual([LINE_A, LINE_B]);
    });

    it('throws NotFoundException when missing', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(svc.findOne(RECIPE_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('list', () => {
    it('orders by createdAt DESC and loads the ingredient relation', async () => {
      repo.find.mockResolvedValue([]);

      await svc.list();

      expect(repo.find).toHaveBeenCalledWith({
        relations: { ingredients: { ingredient: true } },
        order: { createdAt: 'DESC' },
      });
    });

    it('returns the lines ordered by position', async () => {
      repo.find.mockResolvedValue([
        baseRecipe({
          ingredients: [
            recipeLine({ id: LINE_B, position: 1 }),
            recipeLine({ id: LINE_A, position: 0 }),
          ],
        }),
      ]);

      const result = await svc.list();

      expect(result[0].ingredients.map((line) => line.position)).toEqual([0, 1]);
    });
  });
});
