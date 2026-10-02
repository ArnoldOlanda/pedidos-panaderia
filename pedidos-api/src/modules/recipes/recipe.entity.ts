import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

export interface RecipeIngredient {
  nombre: string;
  cantidadGr: number;
  precioKg: number;
}

@Entity('recipes')
@Index('IDX_recipes_name', ['name'])
@Index('IDX_recipes_createdById', ['createdById'])
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'jsonb' })
  ingredients!: RecipeIngredient[];

  @Column({ type: 'float', default: 35 })
  utilidad!: number;

  @Column({ type: 'float' })
  totalCost!: number;

  @Column({ type: 'float' })
  suggestedPrice!: number;

  @Column({ type: 'uuid' })
  createdById!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
