import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RecipeIngredientDto {
  @IsUUID()
  ingredientId!: string;

  @IsNumber()
  @Min(0.001)
  quantityUsed!: number;
}

export class CreateRecipeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients!: RecipeIngredientDto[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  utilidad?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  manoObra?: number;
}
