import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { RecipeIngredient } from './recipe-ingredient.entity';

@Entity('recipes')
@Index('IDX_recipes_name', ['name'])
@Index('IDX_recipes_createdById', ['createdById'])
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @OneToMany(() => RecipeIngredient, (line) => line.recipe, {
    cascade: ['insert'],
  })
  ingredients!: RecipeIngredient[];

  @Column({ type: 'float', default: 100 })
  utilidad!: number;

  @Column({ type: 'float', default: 20 })
  manoObra!: number;

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
