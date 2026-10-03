import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Ingredient, IngredientUnit } from './ingredient.entity';
import {
  ALLOWED_UNIT_PAIRS,
  AllowedUnitPair,
  resolveConversionFactor,
} from './ingredient-units';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';

const PURCHASE_UNIT_TOO_SMALL =
  'la unidad de compra debe ser mayor o igual que la de uso';
const DUPLICATE_NAME = 'ya existe un insumo con ese nombre';
const IN_USE = 'no se puede eliminar el insumo porque está en uso por una receta';
const EMPTY_NAME = 'el nombre del insumo no puede estar vacío';

@Injectable()
export class IngredientsService {
  constructor(
    @InjectRepository(Ingredient)
    private readonly repo: Repository<Ingredient>,
  ) {}

  // Postgres SQLSTATE codes surfaced by the unique index and the recipe FK.
  private static readonly PG_UNIQUE_VIOLATION = '23505';
  private static readonly PG_FK_VIOLATION = '23503';

  private driverCode(err: unknown): string | undefined {
    if (!(err instanceof QueryFailedError)) return undefined;
    return (err as unknown as { driverError?: { code?: string } }).driverError
      ?.code;
  }

  private normalizeName(rawName: string): string {
    const name = rawName.trim();
    if (name.length === 0) {
      throw new BadRequestException(EMPTY_NAME);
    }
    return name;
  }

  private assertConversionPair(
    usageUnit: IngredientUnit,
    purchaseUnit: IngredientUnit,
    conversionFactor: number,
  ): void {
    const expected = resolveConversionFactor(usageUnit, purchaseUnit);
    if (expected === null) {
      throw new BadRequestException(PURCHASE_UNIT_TOO_SMALL);
    }
    if (conversionFactor !== expected) {
      throw new BadRequestException(
        `conversionFactor no corresponde al par de unidades: se esperaba ${expected}`,
      );
    }
  }

  async create(dto: CreateIngredientDto): Promise<Ingredient> {
    this.assertConversionPair(
      dto.usageUnit,
      dto.purchaseUnit,
      dto.conversionFactor,
    );
    const ingredient = this.repo.create({
      name: this.normalizeName(dto.name),
      usageUnit: dto.usageUnit,
      purchaseUnit: dto.purchaseUnit,
      conversionFactor: dto.conversionFactor,
      purchasePrice: dto.purchasePrice,
    });
    try {
      return await this.repo.save(ingredient);
    } catch (err) {
      if (this.driverCode(err) === IngredientsService.PG_UNIQUE_VIOLATION) {
        throw new ConflictException(DUPLICATE_NAME);
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateIngredientDto): Promise<Ingredient> {
    const ingredient = await this.findOne(id);
    // Merge the effective pair so a PATCH changing only one side still
    // validates the resulting usage/purchase combination.
    const usageUnit = dto.usageUnit ?? ingredient.usageUnit;
    const purchaseUnit = dto.purchaseUnit ?? ingredient.purchaseUnit;
    const conversionFactor = dto.conversionFactor ?? ingredient.conversionFactor;
    this.assertConversionPair(usageUnit, purchaseUnit, conversionFactor);
    if (dto.name !== undefined && dto.name !== null) {
      ingredient.name = this.normalizeName(dto.name);
    }
    ingredient.usageUnit = usageUnit;
    ingredient.purchaseUnit = purchaseUnit;
    ingredient.conversionFactor = conversionFactor;
    if (dto.purchasePrice !== undefined && dto.purchasePrice !== null) {
      ingredient.purchasePrice = dto.purchasePrice;
    }
    try {
      return await this.repo.save(ingredient);
    } catch (err) {
      if (this.driverCode(err) === IngredientsService.PG_UNIQUE_VIOLATION) {
        throw new ConflictException(DUPLICATE_NAME);
      }
      throw err;
    }
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    try {
      const result = await this.repo.delete({ id });
      if (!result.affected) {
        throw new NotFoundException(`ingredient ${id} not found`);
      }
    } catch (err) {
      if (this.driverCode(err) === IngredientsService.PG_FK_VIOLATION) {
        throw new ConflictException(IN_USE);
      }
      throw err;
    }
  }

  async list(): Promise<Ingredient[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<Ingredient> {
    const ingredient = await this.repo.findOne({ where: { id } });
    if (!ingredient) {
      throw new NotFoundException(`ingredient ${id} not found`);
    }
    return ingredient;
  }

  listAllowedUnitPairs(): readonly AllowedUnitPair[] {
    return ALLOWED_UNIT_PAIRS;
  }
}
