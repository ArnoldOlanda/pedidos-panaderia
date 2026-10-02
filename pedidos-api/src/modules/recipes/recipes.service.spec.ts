import {
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { RecipesService } from './recipes.service';
import type { Recipe, RecipeIngredient } from './recipe.entity';

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  getRepositoryToken: () => 'RECIPES_REPO',
}));

const VENDOR_A = '11111111-1111-1111-1111-111111111111';
const VENDOR_B = '22222222-2222-2222-2222-222222222222';
const RECIPE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const baseIngredients: RecipeIngredient[] = [
  { nombre: 'Harina', cantidadGr: 1000, precioKg: 5 },
];

type RecipeFixture = Omit<Recipe, 'createdBy'> & { createdBy?: Recipe['createdBy'] };

const baseRecipe = (
  overrides: Partial<Recipe> = {},
): RecipeFixture => ({
  id: RECIPE_ID,
  name: 'Pan de yema',
  ingredients: baseIngredients,
  utilidad: 35,
  totalCost: 6.9, // costoInsumos 5 + igv 0.9 + manoObra 1 = 6.9
  suggestedPrice: 9.315, // 6.9 * 1.35
  createdById: VENDOR_A,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

describe('RecipesService', () => {
  let svc: RecipesService;
  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    (Object.values(repo) as jest.Mock[]).forEach((m) => m.mockReset());
    svc = new RecipesService(repo as any);
  });

  describe('create', () => {
    it('persists createdById and recalculates totalCost + suggestedPrice', async () => {
      const dto = {
        name: 'Pan de yema',
        ingredients: baseIngredients,
      };
      repo.create.mockImplementation((input) => input);
      repo.save.mockImplementation(async (r) => r);

      const result = await svc.create(dto, VENDOR_A);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Pan de yema',
          ingredients: baseIngredients,
          utilidad: 35,
          createdById: VENDOR_A,
        }),
      );
      // costoInsumos=5, igv=0.9, manoObra=1 → costoProd=6.9 → 6.9 * 1.35 = 9.315
      expect(result.totalCost).toBeCloseTo(6.9, 5);
      expect(result.suggestedPrice).toBeCloseTo(9.315, 5);
    });
  });

  describe('update', () => {
    it('updates fields and recalculates totalCost/suggestedPrice for the creator', async () => {
      const existing = baseRecipe();
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation(async (r) => r);

      const newIngredients: RecipeIngredient[] = [
        { nombre: 'Harina', cantidadGr: 1000, precioKg: 10 },
      ];
      const result = await svc.update(RECIPE_ID, VENDOR_A, {
        name: 'Pan especial',
        ingredients: newIngredients,
        utilidad: 50,
      });

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: RECIPE_ID } });
      // costoInsumos=10, igv=1.8, manoObra=2 → costoProd=13.8 → 13.8 * 1.5 = 20.7
      expect(result.name).toBe('Pan especial');
      expect(result.ingredients).toEqual(newIngredients);
      expect(result.utilidad).toBe(50);
      expect(result.totalCost).toBeCloseTo(13.8, 5);
      expect(result.suggestedPrice).toBeCloseTo(20.7, 5);
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
    });

    it('throws ForbiddenException when a different vendor tries to update', async () => {
      repo.findOne.mockResolvedValue(baseRecipe());

      await expect(
        svc.update(RECIPE_ID, VENDOR_B, { name: 'hack' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(repo.save).not.toHaveBeenCalled();
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

    it('throws NotFoundException when missing', async () => {
      repo.findOne.mockResolvedValue(null);
      await expect(svc.findOne(RECIPE_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('list', () => {
    it('orders by createdAt DESC', async () => {
      repo.find.mockResolvedValue([]);
      await svc.list();
      expect(repo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
    });
  });
});

// silence unused-import warning when QueryFailedError isn't used after refactor
void QueryFailedError;