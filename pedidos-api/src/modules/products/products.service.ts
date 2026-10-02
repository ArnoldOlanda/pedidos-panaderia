import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly repo: Repository<Product>,
  ) {}

  private todayString(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
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
}