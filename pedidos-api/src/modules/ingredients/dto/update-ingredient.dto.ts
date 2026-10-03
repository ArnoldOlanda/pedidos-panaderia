import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IngredientUnit } from '../ingredient.entity';

export class UpdateIngredientDto {
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(150)
  name?: string;

  @IsEnum(IngredientUnit)
  @IsOptional()
  usageUnit?: IngredientUnit;

  @IsEnum(IngredientUnit)
  @IsOptional()
  purchaseUnit?: IngredientUnit;

  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'el factor de conversión debe ser mayor o igual que 1' })
  conversionFactor?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  purchasePrice?: number;
}
