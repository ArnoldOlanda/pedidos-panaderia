import {
  BadRequestException,
  ForbiddenException,
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

  async listMine(userId: string): Promise<Order[]> {
    return this.orders.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: { product: true, user: true },
    });
  }

  async listByProduct(
    productId: string,
    requestingUserId: string,
  ): Promise<Order[]> {
    const product = await this.products.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`product ${productId} not found`);
    }
    if (product.createdById !== requestingUserId) {
      throw new ForbiddenException('not the owner of this product');
    }
    return this.orders.find({
      where: { productId },
      order: { createdAt: 'DESC' },
      relations: { user: true, product: true },
    });
  }

  async updateStatus(
    orderId: string,
    newStatus: 'LISTO' | 'ENTREGADO',
    requestingUserId: string,
  ): Promise<Order> {
    const order = await this.orders.findOne({
      where: { id: orderId },
      relations: { product: true },
    });
    if (!order) {
      throw new NotFoundException(`order ${orderId} not found`);
    }
    if (order.product.createdById !== requestingUserId) {
      throw new ForbiddenException('not the owner of this product');
    }

    const current = order.status;
    const requested = newStatus as 'PENDIENTE' | 'LISTO' | 'ENTREGADO';
    if (current === 'ENTREGADO') {
      throw new BadRequestException('order already delivered');
    }
    if (current === 'PENDIENTE' && requested === 'ENTREGADO') {
      throw new BadRequestException(
        'must transition PENDIENTE → LISTO before ENTREGADO',
      );
    }
    if (current === 'LISTO' && requested === 'PENDIENTE') {
      throw new BadRequestException('cannot revert status');
    }

    order.status = requested;
    return this.orders.save(order);
  }
}