import {
  IsNotEmpty,
  IsOptional,
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
  // class-validator's IsUrl accepts only http(s)/ftp by default, so we add
  // the postgres family explicitly. require_tld: false lets localhost URLs
  // through without a dot in the host.
  @IsUrl({ require_tld: false, protocols: ['postgres', 'postgresql'] })
  DATABASE_URL!: string;

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