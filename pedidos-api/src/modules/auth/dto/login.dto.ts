import { IsString, Matches, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^\d{8}$/, { message: 'DNI debe tener exactamente 8 dígitos' })
  dni!: string;

  @IsString()
  @MinLength(2, { message: 'Nombre debe tener al menos 2 caracteres' })
  name!: string;
}