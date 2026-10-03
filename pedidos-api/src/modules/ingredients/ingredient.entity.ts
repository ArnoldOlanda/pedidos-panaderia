import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum IngredientUnit {
  G = 'G',
  KG = 'KG',
  ML = 'ML',
  L = 'L',
  UNIT = 'UNIT',
}

@Entity('ingredients')
@Index('UQ_ingredients_name', ['name'], { unique: true })
export class Ingredient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({
    type: 'enum',
    enum: IngredientUnit,
    enumName: 'ingredient_unit_enum',
  })
  usageUnit!: IngredientUnit;

  @Column({
    type: 'enum',
    enum: IngredientUnit,
    enumName: 'ingredient_unit_enum',
  })
  purchaseUnit!: IngredientUnit;

  @Column({ type: 'float' })
  conversionFactor!: number;

  @Column({ type: 'float' })
  purchasePrice!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
