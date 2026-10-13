import { IsString, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @Matches(/^\d{8}$/, { message: 'DNI debe tener exactamente 8 dígitos' })
  dni!: string;
}
