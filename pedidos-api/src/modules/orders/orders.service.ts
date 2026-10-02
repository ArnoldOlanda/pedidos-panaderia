import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './order.entity';
import { Product } from '../products/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
  ) {}

  async create(dto: CreateOrderDto, userId: string): Promise<Order> {
    const product = await this.products.findOne({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException(`product ${dto.productId} not found`);
    }
    if (product.closed) {
      throw new BadRequestException('product is closed');
    }
    if (product.closesAt.getTime() <= Date.now()) {
      throw new BadRequestException('product window has closed');
    }
    const order = this.orders.create({
      productId: dto.productId,
      userId,
      quantity: dto.quantity,
      status: 'PENDIENTE',
    });
    return this.orders.save(order);
  }
}