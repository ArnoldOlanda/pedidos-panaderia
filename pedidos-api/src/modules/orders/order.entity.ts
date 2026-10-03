import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../products/product.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, { eager: false })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'varchar', length: 8 })
  buyerDni!: string;

  @Column({ type: 'varchar', length: 120 })
  buyerName!: string;

  @Column({ type: 'varchar', length: 120 })
  buyerApellidos!: string;

  @Column({ type: 'varchar', length: 120 })
  buyerCarrera!: string;

  @Column({ type: 'uuid' })
  buyerDeviceId!: string;

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