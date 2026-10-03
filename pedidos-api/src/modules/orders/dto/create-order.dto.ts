import {
  IsInt,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @IsPositive()
  @Max(10, { message: 'maximum 10 units per order' })
  quantity!: number;

  @IsString()
  @Matches(/^\d{8}$/, { message: 'DNI debe tener exactamente 8 dígitos' })
  buyerDni!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  buyerName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  buyerApellidos!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  buyerCarrera!: string;

  @IsUUID()
  buyerDeviceId!: string;
}