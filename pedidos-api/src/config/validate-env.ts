// CLI entry points (data-source, seed) own the `import 'dotenv/config'` side
// effect at their own top — putting it here would leak `.env` values into
// `process.env` even when Nest's ConfigModule is driving the load (which
// would silently override test `load:` overrides with empty `.env` values).
// The Nest runtime loads env through @nestjs/config and calls `validateEnv`
// with the already-loaded env; this module is validation-only.
import { plainToInstance } from 'class-transformer';
import {
  ValidationError,
  validateSync,
} from 'class-validator';
import { EnvSchema } from './env.schema';

export interface EnvValidated {
  DB_HOST: string;
  DB_PORT: string;
  DB_DATABASE: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  JWT_SECRET: string;
  VAPID_SUBJECT: string;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  WEB_ORIGIN: string;
  NODE_ENV?: string;
  PORT?: string;
  JWT_EXPIRES_IN?: string;
}

export class EnvValidationError extends Error {
  constructor(issues: string[]) {
    super(
      `Invalid environment configuration:\n  - ${issues.join('\n  - ')}`,
    );
    this.name = 'EnvValidationError';
  }
}

function formatErrors(errors: ValidationError[]): string[] {
  const out: string[] = [];
  const walk = (errs: ValidationError[], parent?: string): void => {
    for (const err of errs) {
      const key = parent ? `${parent}.${err.property}` : err.property;
      if (err.constraints) {
        for (const msg of Object.values(err.constraints)) {
          out.push(`${key}: ${msg}`);
        }
      }
      if (err.children && err.children.length > 0) {
        walk(err.children, key);
      }
    }
  };
  walk(errors);
  return out;
}

/**
 * Internal synchronous validator. Performs the class-validator check on a
 * raw env object and throws an aggregated error if any required field is
 * missing or invalid. Returns the validated env cast to `EnvValidated`.
 */
function validateRaw(raw: Record<string, unknown>): EnvValidated {
  const instance = plainToInstance(EnvSchema, raw, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(instance, {
    whitelist: true,
    forbidNonWhitelisted: false,
  });
  if (errors.length > 0) {
    throw new EnvValidationError(formatErrors(errors));
  }
  return instance as unknown as EnvValidated;
}

/**
 * Validator for Nest's ConfigModule. By the time this runs, @nestjs/config
 * has already loaded the env file, so we only re-validate the captured raw
 * snapshot. Synchronous so it satisfies `ConfigModuleOptions['validate']`.
 */
export function validateEnv(raw: Record<string, unknown>): EnvValidated {
  return validateRaw(raw);
}

/**
 * Validator for CLI scripts (data-source, seed). Async in signature to match
 * the contract used by the verification script. The implementation is
 * synchronous under the hood — the returned promise resolves immediately.
 */
export async function loadAndValidateEnv(): Promise<EnvValidated> {
  return validateRaw(process.env);
}

/**
 * Synchronous counterpart for CLI scripts running under module: commonjs
 * where top-level await is unavailable. data-source.ts uses this because
 * the typeorm CLI needs a DataSource instance at import time.
 */
export function loadAndValidateEnvSync(): EnvValidated {
  return validateRaw(process.env);
}