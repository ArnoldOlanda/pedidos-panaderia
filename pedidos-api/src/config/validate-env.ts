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
import {
  DatabaseConfig,
  DatabaseConfigError,
  DatabaseEnvInput,
  resolveDatabaseConfig,
} from './database-url';
import { EnvSchema } from './env.schema';

export interface EnvValidated {
  DATABASE_URL?: string;
  DB_HOST: string;
  DB_PORT: string;
  DB_DATABASE: string;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_SSL: boolean;
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
 * Outcome of the database phase. Kept as a value rather than thrown so a
 * database failure cannot end the validation early the way a raised
 * `DatabaseConfigError` used to.
 */
type DatabaseResolution =
  | { ok: true; config: DatabaseConfig }
  | { ok: false; issues: string[] };

function tryResolveDatabase(env: DatabaseEnvInput): DatabaseResolution {
  try {
    return { ok: true, config: resolveDatabaseConfig(env) };
  } catch (err) {
    if (err instanceof DatabaseConfigError) {
      return { ok: false, issues: err.issues };
    }
    throw err;
  }
}

/**
 * The field an issue is about: the segment before the first colon. Used to
 * recognise an issue that both validation phases reported for the same
 * variable.
 */
function issueField(issue: string): string {
  const separator = issue.indexOf(':');
  return separator === -1 ? issue : issue.slice(0, separator);
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

  // Both phases always run and their issues are reported together. Throwing
  // on the class-validator errors first made the database group disappear
  // whenever an unrelated variable was also invalid — the diagnostic the
  // pre-deploy check exists to give. On Railway a misconfigured env commonly
  // has *both* an unset DATABASE_URL and another invalid variable, so
  // reporting one group at a time made operators fix problems one deploy at
  // a time.
  //
  // The database group is the one cross-field rule class-validator cannot
  // express, so it is resolved here and folded back into the DB_* names. Every
  // consumer (data-source, seed, app.module) keeps reading DB_HOST/DB_PORT/...
  // no matter which shape the operator configured, which keeps this a
  // deployment concern instead of a refactor of every call site.
  const validated = instance as unknown as EnvValidated;
  const schemaIssues = formatErrors(errors);
  const resolution = tryResolveDatabase(validated);

  if (!resolution.ok) {
    // A single field can be rejected by both phases: DB_PORT=99999 fails the
    // @IsPort range check and the resolver's own range check. Reporting it
    // twice makes one problem look like two and buries the ones that actually
    // need acting on, which is the opposite of what an aggregated error is
    // for. The message cannot come out empty: when every resolver issue is a
    // duplicate, each one corresponds to a schema issue already listed.
    const alreadyReported = new Set(schemaIssues.map(issueField));
    const fresh = resolution.issues.filter(
      (issue) => !alreadyReported.has(issueField(issue)),
    );
    throw new EnvValidationError([...schemaIssues, ...fresh]);
  }

  if (schemaIssues.length > 0) {
    throw new EnvValidationError(schemaIssues);
  }
  const database = resolution.config;

  return {
    ...validated,
    DB_HOST: database.host,
    DB_PORT: String(database.port),
    DB_DATABASE: database.database,
    DB_USERNAME: database.username,
    DB_PASSWORD: database.password,
    DB_SSL: database.ssl,
  };
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