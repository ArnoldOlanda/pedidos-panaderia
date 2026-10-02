import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Recipe } from '../recipes/recipe.entity';
import { User } from '../users/user.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  recipeId!: string;

  @ManyToOne(() => Recipe, { eager: false })
  @JoinColumn({ name: 'recipeId' })
  recipe!: Recipe;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'float' })
  price!: number;

  @Column({ type: 'date' })
  availableDate!: string;

  @Column({ type: 'timestamp' })
  closesAt!: Date;

  @Column({ type: 'boolean', default: false })
  closed!: boolean;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;
}