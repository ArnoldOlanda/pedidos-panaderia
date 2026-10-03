import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { IngredientsService } from './ingredients.service';
import { Ingredient, IngredientUnit } from './ingredient.entity';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  getRepositoryToken: () => 'INGREDIENTS_REPO',
}));

const INGREDIENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const baseIngredient = (
  overrides: Partial<Ingredient> = {},
): Ingredient => ({
  id: INGREDIENT_ID,
  name: 'Harina',
  usageUnit: IngredientUnit.G,
  purchaseUnit: IngredientUnit.KG,
  conversionFactor: 1000,
  purchasePrice: 5,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

const pgError = (code: string) =>
  new QueryFailedError('q', [], Object.assign(new Error(code), { code }));

describe('IngredientsService', () => {
  let svc: IngredientsService;
  const repo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    (Object.values(repo) as jest.Mock[]).forEach((m) => m.mockReset());
    svc = new IngredientsService(repo as any);
  });

  describe('create', () => {
    it('trims the name and persists the ingredient', async () => {
      repo.create.mockImplementation((input) => input);
      repo.save.mockImplementation(async (i) => i);

      const result = await svc.create({
        name: '  Harina  ',
        usageUnit: IngredientUnit.G,
        purchaseUnit: IngredientUnit.KG,
        conversionFactor: 1000,
        purchasePrice: 5,
      });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Harina',
          usageUnit: IngredientUnit.G,
          purchaseUnit: IngredientUnit.KG,
          conversionFactor: 1000,
          purchasePrice: 5,
        }),
      );
      expect(result.name).toBe('Harina');
    });

    it('rejects a cross-family pair (mass vs volume)', async () => {
      await expect(
        svc.create({
          name: 'Harina',
          usageUnit: IngredientUnit.KG,
          purchaseUnit: IngredientUnit.ML,
          conversionFactor: 1000,
          purchasePrice: 5,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects an inverted pair where purchase is smaller than usage', async () => {
      await expect(
        svc.create({
          name: 'Harina',
          usageUnit: IngredientUnit.KG,
          purchaseUnit: IngredientUnit.G,
          conversionFactor: 1000,
          purchasePrice: 5,
        }),
      ).rejects.toThrow(
        'la unidad de compra debe ser mayor o igual que la de uso',
      );

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('rejects a conversionFactor that does not match the pair', async () => {
      await expect(
        svc.create({
          name: 'Harina',
          usageUnit: IngredientUnit.G,
          purchaseUnit: IngredientUnit.KG,
          conversionFactor: 1,
          purchasePrice: 5,
        }),
      ).rejects.toThrow(
        'conversionFactor no corresponde al par de unidades: se esperaba 1000',
      );

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('maps a duplicate name (23505) to ConflictException', async () => {
      repo.create.mockImplementation((input) => input);
      repo.save.mockRejectedValue(pgError('23505'));

      await expect(
        svc.create({
          name: 'Harina',
          usageUnit: IngredientUnit.G,
          purchaseUnit: IngredientUnit.KG,
          conversionFactor: 1000,
          purchasePrice: 5,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rejects a whitespace-only name', async () => {
      await expect(
        svc.create({
          name: '   ',
          usageUnit: IngredientUnit.G,
          purchaseUnit: IngredientUnit.KG,
          conversionFactor: 1000,
          purchasePrice: 5,
        }),
      ).rejects.toThrow('el nombre del insumo no puede estar vacío');

      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('merges the effective pair when only purchaseUnit changes to an invalid one', async () => {
      repo.findOne.mockResolvedValue(
        baseIngredient({
          usageUnit: IngredientUnit.G,
          purchaseUnit: IngredientUnit.KG,
        }),
      );

      await expect(
        svc.update(INGREDIENT_ID, { purchaseUnit: IngredientUnit.ML }),
      ).rejects.toThrow(
        'la unidad de compra debe ser mayor o igual que la de uso',
      );

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('keeps the stored usageUnit when only a valid purchaseUnit is patched', async () => {
      repo.findOne.mockResolvedValue(
        baseIngredient({
          usageUnit: IngredientUnit.G,
          purchaseUnit: IngredientUnit.KG,
          conversionFactor: 1000,
        }),
      );
      repo.save.mockImplementation(async (i) => i);

      const result = await svc.update(INGREDIENT_ID, {
        purchaseUnit: IngredientUnit.KG,
      });

      expect(repo.save).toHaveBeenCalledTimes(1);
      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ usageUnit: IngredientUnit.G }),
      );
      expect(result.usageUnit).toBe(IngredientUnit.G);
    });

    it('rejects a conversionFactor that does not match the stored pair', async () => {
      repo.findOne.mockResolvedValue(
        baseIngredient({
          usageUnit: IngredientUnit.G,
          purchaseUnit: IngredientUnit.KG,
          conversionFactor: 1000,
        }),
      );

      await expect(
        svc.update(INGREDIENT_ID, { conversionFactor: 500 }),
      ).rejects.toThrow(
        'conversionFactor no corresponde al par de unidades: se esperaba 1000',
      );

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('treats a null name as not provided and keeps the stored name', async () => {
      repo.findOne.mockResolvedValue(baseIngredient({ name: 'Harina' }));
      repo.save.mockImplementation(async (i) => i);

      const result = await svc.update(INGREDIENT_ID, {
        name: null,
      } as unknown as UpdateIngredientDto);

      expect(result.name).toBe('Harina');
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('treats a null purchasePrice as not provided and keeps the stored price', async () => {
      repo.findOne.mockResolvedValue(baseIngredient({ purchasePrice: 5.2 }));
      repo.save.mockImplementation(async (i) => i);

      const result = await svc.update(INGREDIENT_ID, {
        purchasePrice: null,
      } as unknown as UpdateIngredientDto);

      expect(result.purchasePrice).toBe(5.2);
      expect(repo.save).toHaveBeenCalledTimes(1);
    });

    it('rejects a whitespace-only name and does not save', async () => {
      repo.findOne.mockResolvedValue(baseIngredient());

      await expect(
        svc.update(INGREDIENT_ID, { name: '   ' }),
      ).rejects.toThrow('el nombre del insumo no puede estar vacío');

      expect(repo.save).not.toHaveBeenCalled();
    });

    it('maps a duplicate name (23505) to ConflictException', async () => {
      repo.findOne.mockResolvedValue(baseIngredient());
      repo.save.mockRejectedValue(pgError('23505'));

      await expect(
        svc.update(INGREDIENT_ID, { name: 'Azúcar' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('trims the name and saves a valid update', async () => {
      repo.findOne.mockResolvedValue(baseIngredient());
      repo.save.mockImplementation(async (i) => i);

      const result = await svc.update(INGREDIENT_ID, {
        name: '  Azúcar  ',
        purchasePrice: 8,
      });

      expect(result.name).toBe('Azúcar');
      expect(result.purchasePrice).toBe(8);
    });
  });

  describe('remove', () => {
    it('maps an in-use foreign-key violation (23503) to ConflictException', async () => {
      repo.findOne.mockResolvedValue(baseIngredient());
      repo.delete.mockRejectedValue(pgError('23503'));

      await expect(svc.remove(INGREDIENT_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws NotFoundException when the ingredient does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        svc.remove('00000000-0000-0000-0000-000000000000'),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(repo.delete).not.toHaveBeenCalled();
    });

    it('deletes an existing ingredient', async () => {
      repo.findOne.mockResolvedValue(baseIngredient());
      repo.delete.mockResolvedValue({ affected: 1 });

      await expect(svc.remove(INGREDIENT_ID)).resolves.toBeUndefined();
      expect(repo.delete).toHaveBeenCalledWith({ id: INGREDIENT_ID });
    });

    it('throws NotFoundException when the delete affects no rows', async () => {
      repo.findOne.mockResolvedValue(baseIngredient());
      repo.delete.mockResolvedValue({ affected: 0 });

      await expect(svc.remove(INGREDIENT_ID)).rejects.toThrow(
        `ingredient ${INGREDIENT_ID} not found`,
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the ingredient is missing', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(svc.findOne(INGREDIENT_ID)).rejects.toThrow(
        `ingredient ${INGREDIENT_ID} not found`,
      );
    });
  });

  describe('list', () => {
    it('orders by name ASC', async () => {
      repo.find.mockResolvedValue([]);
      await svc.list();
      expect(repo.find).toHaveBeenCalledWith({ order: { name: 'ASC' } });
    });
  });

  describe('listAllowedUnitPairs', () => {
    it('returns the five allowed unit pairs', () => {
      expect(svc.listAllowedUnitPairs()).toEqual([
        {
          usageUnit: IngredientUnit.G,
          purchaseUnit: IngredientUnit.G,
          conversionFactor: 1,
        },
        {
          usageUnit: IngredientUnit.G,
          purchaseUnit: IngredientUnit.KG,
          conversionFactor: 1000,
        },
        {
          usageUnit: IngredientUnit.ML,
          purchaseUnit: IngredientUnit.ML,
          conversionFactor: 1,
        },
        {
          usageUnit: IngredientUnit.ML,
          purchaseUnit: IngredientUnit.L,
          conversionFactor: 1000,
        },
        {
          usageUnit: IngredientUnit.UNIT,
          purchaseUnit: IngredientUnit.UNIT,
          conversionFactor: 1,
        },
      ]);
    });
  });
});
