import { IsString, IsUrl, MaxLength } from 'class-validator';

export class UnsubscribeDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  endpoint!: string;
}