import {
  IsNotEmpty,
  IsOptional,
  IsPort,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

/**
 * Runtime env schema validated via class-validator. The fields below are
 * populated by `plainToInstance` from the captured env snapshot — see
 * `validate-env.ts`. Plain field declarations (not constructor params) keep
 * the instance shape predictable for the transformer.
 */
export class EnvSchema {
  // Laravel-style DB connection fields. The driver is fixed to PostgreSQL
  // in app.module.ts / data-source.ts / seed.ts — there is no
  // DB_CONNECTION switch. DB_PORT is kept as a string because Nest's
  // ConfigService returns env values as strings; @IsPort still validates
  // the range 1..65535. DB_PASSWORD is required but allowed to be empty
  // (trust-auth setups).
  @IsString()
  @IsNotEmpty()
  DB_HOST!: string;

  @IsPort()
  DB_PORT!: string;

  @IsString()
  @IsNotEmpty()
  DB_DATABASE!: string;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME!: string;

  @IsString()
  DB_PASSWORD!: string;

  @IsString()
  @MinLength(16)
  JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  VAPID_SUBJECT!: string;

  @IsString()
  @MinLength(20)
  VAPID_PUBLIC_KEY!: string;

  @IsString()
  @MinLength(20)
  VAPID_PRIVATE_KEY!: string;

  // require_tld: false so localhost (dev) and bare-host URLs pass without
  // a dot in the host. require_protocol: true rejects bare origins.
  @IsUrl({ require_protocol: true, require_tld: false })
  WEB_ORIGIN!: string;

  @IsOptional()
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @IsString()
  PORT?: string;

  @IsOptional()
  @IsString()
  JWT_EXPIRES_IN?: string;
}