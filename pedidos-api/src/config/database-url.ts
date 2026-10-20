/**
 * Database configuration resolution.
 *
 * Two shapes are supported, and they exist for two different environments:
 *
 * - `DATABASE_URL` — what Railway injects from its Postgres plugin, and what
 *   most hosted providers hand out. Single variable, credentials and SSL mode
 *   encoded in the URL itself.
 * - The `DB_*` group — the Laravel-style fields the local WSL Postgres needs,
 *   kept unchanged so `pedidos-api/.env` does not have to be rewritten.
 *
 * The `DB_*` group wins when present, because an explicit local config should
 * never be silently overridden by a stray `DATABASE_URL` left over from a
 * previous deploy. A *partial* `DB_*` group is an error rather than a
 * fallback: a half-configured database that silently connects to a different
 * host is far worse than a boot failure.
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  /** True when the server must be reached over TLS. */
  ssl: boolean;
}

export interface DatabaseEnvInput {
  DATABASE_URL?: string;
  DB_HOST?: string;
  DB_PORT?: string;
  DB_DATABASE?: string;
  DB_USERNAME?: string;
  DB_PASSWORD?: string;
  // Accepts a boolean so the function is idempotent: an already-normalised
  // env (DB_SSL resolved to a boolean) can be passed straight back in.
  DB_SSL?: string | boolean;
}

/** Fields required when configuring via the `DB_*` group. */
const REQUIRED_DB_FIELDS = [
  'DB_HOST',
  'DB_PORT',
  'DB_DATABASE',
  'DB_USERNAME',
  'DB_PASSWORD',
] as const;

/** Fields that must be non-empty. `DB_PASSWORD` may legitimately be empty. */
const NON_EMPTY_DB_FIELDS: ReadonlySet<string> = new Set([
  'DB_HOST',
  'DB_PORT',
  'DB_DATABASE',
  'DB_USERNAME',
]);

const DEFAULT_PORT = 5432;

/** `sslmode` values that mean "negotiate TLS". */
const SSL_MODES_ON = new Set(['require', 'verify-ca', 'verify-full']);

/**
 * Raised when the env cannot produce a usable database configuration. Carries
 * the individual issues so the caller can re-raise them inside its own
 * aggregated error format instead of nesting one error message inside another.
 */
export class DatabaseConfigError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Invalid database configuration:\n  - ${issues.join('\n  - ')}`);
    this.name = 'DatabaseConfigError';
    this.issues = issues;
  }
}

function isDbSslEnabled(raw: string | boolean | undefined): boolean {
  if (raw === undefined) {
    return false;
  }
  if (typeof raw === 'boolean') {
    return raw;
  }
  const normalized = raw.trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
}

/**
 * Parses a postgres URL into connection fields.
 *
 * Uses the WHATWG `URL` parser rather than a hand-rolled split: it already
 * handles the two things that break naive parsers — percent-encoded
 * credentials, and a password containing an unencoded `@` (userinfo ends at
 * the *last* `@`, not the first).
 */
export function parseDatabaseUrl(raw: string): DatabaseConfig {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new DatabaseConfigError([
      `DATABASE_URL: not a valid URL (${JSON.stringify(raw)})`,
    ]);
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    throw new DatabaseConfigError([
      `DATABASE_URL: unsupported scheme ${JSON.stringify(url.protocol)} (expected postgresql: or postgres:)`,
    ]);
  }

  const issues: string[] = [];
  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (url.hostname === '') {
    issues.push('DATABASE_URL: missing host');
  }
  if (url.username === '') {
    issues.push('DATABASE_URL: missing username');
  }
  if (database === '') {
    issues.push('DATABASE_URL: missing database name');
  }
  if (url.port !== '' && !(Number(url.port) >= 1 && Number(url.port) <= 65535)) {
    issues.push(`DATABASE_URL: invalid port ${JSON.stringify(url.port)}`);
  }
  if (issues.length > 0) {
    throw new DatabaseConfigError(issues);
  }

  const sslMode = url.searchParams.get('sslmode');

  return {
    host: url.hostname,
    port: url.port === '' ? DEFAULT_PORT : Number(url.port),
    database,
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: sslMode !== null && SSL_MODES_ON.has(sslMode.toLowerCase()),
  };
}

/**
 * Resolves the effective database configuration from the raw env, preferring
 * the explicit `DB_*` group over `DATABASE_URL`.
 *
 * @throws {DatabaseConfigError} when neither source is complete, listing every
 * problem at once rather than failing on the first one.
 */
export function resolveDatabaseConfig(env: DatabaseEnvInput): DatabaseConfig {
  const provided = REQUIRED_DB_FIELDS.filter(
    (field) => env[field] !== undefined,
  );

  if (provided.length > 0) {
    const issues = REQUIRED_DB_FIELDS.filter((field) => {
      if (env[field] === undefined) {
        return true;
      }
      return NON_EMPTY_DB_FIELDS.has(field) && env[field] === '';
    }).map((field) => `${field}: missing or empty`);

    if (issues.length > 0) {
      throw new DatabaseConfigError(issues);
    }

    const port = parseInt(env.DB_PORT as string, 10);
    if (!(port >= 1 && port <= 65535)) {
      throw new DatabaseConfigError([
        `DB_PORT: ${JSON.stringify(env.DB_PORT)} is not a port in 1..65535`,
      ]);
    }

    return {
      host: env.DB_HOST as string,
      port,
      database: env.DB_DATABASE as string,
      username: env.DB_USERNAME as string,
      password: env.DB_PASSWORD as string,
      ssl: isDbSslEnabled(env.DB_SSL),
    };
  }

  if (env.DATABASE_URL !== undefined && env.DATABASE_URL !== '') {
    const parsed = parseDatabaseUrl(env.DATABASE_URL);
    return { ...parsed, ssl: parsed.ssl || isDbSslEnabled(env.DB_SSL) };
  }

  throw new DatabaseConfigError([
    'DATABASE_URL: not set',
    'DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME, DB_PASSWORD: none of them are set',
  ]);
}

/**
 * TypeORM `ssl` option for a resolved config. Railway's public Postgres proxy
 * presents a certificate that does not chain to a public root, so the
 * transport is encrypted but the peer is not verified — which is why
 * `rejectUnauthorized` is off rather than the connection being plaintext.
 */
export function postgresSslOption(
  ssl: boolean,
): { rejectUnauthorized: boolean } | false {
  return ssl ? { rejectUnauthorized: false } : false;
}