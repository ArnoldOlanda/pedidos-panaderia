import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../products/product.entity';
import { User } from '../users/user.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, { eager: false })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({
    type: 'enum',
    enum: ['PENDIENTE', 'LISTO', 'ENTREGADO'],
    default: 'PENDIENTE',
  })
  status!: 'PENDIENTE' | 'LISTO' | 'ENTREGADO';

  @CreateDateColumn()
  createdAt!: Date;
}