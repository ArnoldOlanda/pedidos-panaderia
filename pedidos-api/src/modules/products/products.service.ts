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

/**
 * Product shape for the shared vendor board.
 *
 * Deliberately not the `Product` entity: it adds the publisher's name while
 * keeping the `User` row (dni, pushSub, createdAt) out of the response.
 */
export interface VendorTodayProduct {
  id: string;
  recipeId: string;
  name: string;
  price: number;
  availableDate: string;
  closesAt: Date;
  closed: boolean;
  createdById: string;
  createdAt: Date;
  createdByName: string;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly repo: Repository<Product>,
    @InjectRepository(Recipe)
    private readonly recipeRepo: Repository<Recipe>,
  ) {}

  private todayString(): string {
    // The product is consumed in Lima; the catalog day boundary must match
    // America/Lima, not the server's UTC clock. Otherwise a vendor who opens
    // the form right around midnight UTC can submit a date the backend
    // rejects with "availableDate must be today or later" because the
    // server already rolled to the next Lima day.
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return f.format(new Date());
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

  /**
   * Today's products from every vendor, for the shared vendor board.
   *
   * Vendor-only: the publisher's name must not reach the public catalog, so
   * this is a separate method and endpoint from `listTodayPublic`. The rows
   * are mapped field by field instead of returned as entities, because
   * returning them would serialise the eager-loaded `createdBy` User
   * (dni, pushSub, createdAt) into the response.
   */
  async listTodayAll(): Promise<VendorTodayProduct[]> {
    const rows = await this.repo.find({
      where: { availableDate: this.todayString() },
      relations: { createdBy: true },
      order: { closesAt: 'ASC' },
    });
    return rows.map((p) => ({
      id: p.id,
      recipeId: p.recipeId,
      name: p.name,
      price: p.price,
      availableDate: p.availableDate,
      closesAt: p.closesAt,
      closed: p.closed,
      createdById: p.createdById,
      createdAt: p.createdAt,
      createdByName: p.createdBy?.name ?? '',
    }));
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