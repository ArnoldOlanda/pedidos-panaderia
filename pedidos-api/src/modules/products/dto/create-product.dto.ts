import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @IsUUID()
  recipeId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsNumber()
  @IsPositive()
  price!: number;

  @Type(() => Date)
  @IsDate()
  availableDate!: Date;

  @Type(() => Date)
  @IsDate()
  closesAt!: Date;
}