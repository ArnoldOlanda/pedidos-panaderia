import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';
import { Recipe } from '../recipes/recipe.entity';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly repo: Repository<Product>,
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
  ) {}

  private todayString(): string {
    return ymd(new Date());
  }

  async listTodayPublic(): Promise<Product[]> {
    return this.repo.find({
      where: { availableDate: this.todayString() },
      order: { closesAt: 'ASC' },
    });
  }

  async listMineToday(createdById: string): Promise<Product[]> {
    return this.repo.find({
      where: { availableDate: this.todayString(), createdById },
      order: { closesAt: 'ASC' },
    });
  }

  async findOnePublic(id: string): Promise<Product> {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException(`product ${id} not found`);
    return p;
  }

  async closeExpired(): Promise<{ closedCount: number; closed: Product[] }> {
    const candidates = await this.repo.find({ where: { closed: false } });
    const now = Date.now();
    const expired = candidates.filter((p) => p.closesAt.getTime() <= now);
    for (const p of expired) {
      p.closed = true;
      await this.repo.save(p);
    }
    return { closedCount: expired.length, closed: expired };
  }

  async create(
    dto: CreateProductDto,
    createdById: string,
  ): Promise<Product> {
    if (dto.closesAt.getTime() <= Date.now()) {
      throw new BadRequestException('closesAt must be in the future');
    }
    const availableDateYmd = ymd(dto.availableDate);
    const today = this.todayString();
    if (availableDateYmd < today) {
      throw new BadRequestException(
        'availableDate must be today or later',
      );
    }
    const recipe = await this.recipeRepo.findOne({
      where: { id: dto.recipeId },
    });
    if (!recipe) {
      throw new NotFoundException(`recipe ${dto.recipeId} not found`);
    }
    const product = this.repo.create({
      recipeId: dto.recipeId,
      name: dto.name,
      price: dto.price,
      availableDate: availableDateYmd,
      closesAt: dto.closesAt,
      closed: false,
      createdById,
    });
    return this.repo.save(product);
  }
}

function ymd(d: Date): string {
  // The DTO receives a calendar date-only string (e.g. "2026-10-02"), which
  // class-transformer parses as UTC midnight. Use UTC accessors so the
  // returned yyyy-MM-dd equals the calendar day the user typed, even when the
  // server runs in a non-UTC timezone (e.g. America/Lima, UTC-5).
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}