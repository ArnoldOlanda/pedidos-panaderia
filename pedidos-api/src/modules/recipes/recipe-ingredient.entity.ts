import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ingredient } from '../ingredients/ingredient.entity';
import { Recipe } from './recipe.entity';

@Entity('recipe_ingredients')
@Index('IDX_recipe_ingredients_recipe', ['recipeId'])
@Index('IDX_recipe_ingredients_ingredient', ['ingredientId'])
@Index('UQ_recipe_ingredients_recipe_ingredient', ['recipeId', 'ingredientId'], {
  unique: true,
})
export class RecipeIngredient {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  recipeId!: string;

  @ManyToOne(() => Recipe, (recipe) => recipe.ingredients, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'recipeId' })
  recipe!: Recipe;

  @Column({ type: 'uuid' })
  ingredientId!: string;

  @ManyToOne(() => Ingredient, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'ingredientId' })
  ingredient!: Ingredient;

  @Column({ type: 'float' })
  quantityUsed!: number;

  @Column({ type: 'int' })
  position!: number;
}
