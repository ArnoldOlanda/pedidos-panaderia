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
  // Database connection, in two supported shapes:
  //
  //   - DATABASE_URL: what Railway injects from its Postgres plugin.
  //   - DB_HOST/DB_PORT/DB_DATABASE/DB_USERNAME/DB_PASSWORD: the local WSL
  //     Postgres, unchanged so existing .env files keep working.
  //
  // All of them are optional at the decorator level because "exactly one
  // complete group" is a cross-field rule that class-validator cannot
  // express; resolveDatabaseConfig in database-url.ts enforces it and reports
  // every missing field at once. DB_PORT keeps its 1..65535 range check via
  // @IsPort, and is a string because ConfigService returns env values as
  // strings. The driver is fixed to PostgreSQL in app.module.ts /
  // data-source.ts / seed.ts, so there is no DB_CONNECTION switch.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  DATABASE_URL?: string;

  @IsOptional()
  @IsString()
  DB_HOST?: string;

  @IsOptional()
  @IsPort()
  DB_PORT?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  DB_DATABASE?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  DB_USERNAME?: string;

  // Allowed to be empty: trust-auth setups have no password.
  @IsOptional()
  @IsString()
  DB_PASSWORD?: string;

  // Forces TLS on regardless of what the URL's sslmode says. Only needed when
  // a provider injects a bare DATABASE_URL without that query parameter.
  @IsOptional()
  @IsString()
  DB_SSL?: string;

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