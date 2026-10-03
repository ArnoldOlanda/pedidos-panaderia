import {
  IsEnum,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IngredientUnit } from '../ingredient.entity';

export class CreateIngredientDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  name!: string;

  @IsEnum(IngredientUnit)
  usageUnit!: IngredientUnit;

  @IsEnum(IngredientUnit)
  purchaseUnit!: IngredientUnit;

  @IsNumber()
  @Min(0)
  conversionFactor!: number;

  @IsNumber()
  @Min(0)
  purchasePrice!: number;
}
