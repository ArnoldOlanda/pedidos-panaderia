import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RecipeIngredientDto } from './create-recipe.dto';

export { RecipeIngredientDto };

export class UpdateRecipeDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsArray()
  @IsOptional()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  ingredients?: RecipeIngredientDto[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  utilidad?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  manoObra?: number;
}