import { IsString, Matches } from 'class-validator';

export class ByDniQueryDto {
  @IsString()
  @Matches(/^\d{8}$/, { message: 'DNI debe tener exactamente 8 dígitos' })
  dni!: string;
}