import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RecipeIngredientDto {
  @IsString()
  @MinLength(1)
  nombre!: string;

  @IsNumber()
  @Min(0)
  cantidadGr!: number;

  @IsNumber()
  @Min(0)
  precioKg!: number;
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
  @Min(0)
  utilidad?: number;
}
