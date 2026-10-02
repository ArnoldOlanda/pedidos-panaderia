import { IsEnum } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsEnum(['LISTO', 'ENTREGADO'] as const, {
    message: 'status must be LISTO or ENTREGADO',
  })
  status!: 'LISTO' | 'ENTREGADO';
}