import { IsInt, IsPositive, IsUUID, Max } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  productId!: string;

  @IsInt()
  @IsPositive()
  @Max(10, { message: 'maximum 10 units per order' })
  quantity!: number;
}