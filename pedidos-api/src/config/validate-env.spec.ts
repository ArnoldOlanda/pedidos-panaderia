// class-validator decorators rely on Reflect metadata, which nothing in this
// import graph loads on its own (the Nest bootstrap does it for the app).
import 'reflect-metadata';
import { EnvValidationError, validateEnv } from './validate-env';

/** A complete, valid production-shaped env driven by DATABASE_URL. */
const withDatabaseUrl = (extra: Record<string, string> = {}) => ({
  DATABASE_URL: 'postgresql://ana:hunter2@db.railway.app:5432/railway?sslmode=require',
  JWT_SECRET: 'a-secret-long-enough-for-validation',
  VAPID_SUBJECT: 'mailto:admin@example.com',
  VAPID_PUBLIC_KEY: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
  VAPID_PRIVATE_KEY:
    'y8Ko7b2Vx9wQm3ZrTnLpHs5DcFgN1aUeJ4iWqB0xC6vMyD7sKeT3lRhG2oPzXcVn',
  WEB_ORIGIN: 'https://pedidos.up.railway.app',
  ...extra,
});

/** The local WSL Postgres shape, unchanged from before the deploy work. */
const withDbFields = (extra: Record<string, string> = {}) => ({
  DB_HOST: '127.0.0.1',
  DB_PORT: '5433',
  DB_DATABASE: 'pedidos',
  DB_USERNAME: 'pedidos',
  DB_PASSWORD: 'pedidos',
  JWT_SECRET: 'a-secret-long-enough-for-validation',
  VAPID_SUBJECT: 'mailto:admin@example.com',
  VAPID_PUBLIC_KEY: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
  VAPID_PRIVATE_KEY:
    'y8Ko7b2Vx9wQm3ZrTnLpHs5DcFgN1aUeJ4iWqB0xC6vMyD7sKeT3lRhG2oPzXcVn',
  WEB_ORIGIN: 'http://localhost:5173',
  ...extra,
});

describe('validateEnv — database resolution', () => {
  it('normalises DATABASE_URL into the DB_* fields', () => {
    const env = validateEnv(withDatabaseUrl());
    expect(env.DB_HOST).toBe('db.railway.app');
    expect(env.DB_PORT).toBe('5432');
    expect(env.DB_DATABASE).toBe('railway');
    expect(env.DB_USERNAME).toBe('ana');
    expect(env.DB_PASSWORD).toBe('hunter2');
  });

  it('turns sslmode=require into DB_SSL', () => {
    expect(validateEnv(withDatabaseUrl()).DB_SSL).toBe(true);
  });

  it('leaves DB_SSL off for a URL without sslmode', () => {
    const env = validateEnv(
      withDatabaseUrl({
        DATABASE_URL: 'postgresql://ana:hunter2@localhost:5432/pedidos',
      }),
    );
    expect(env.DB_SSL).toBe(false);
  });

  it('leaves the DB_* group working exactly as before', () => {
    const env = validateEnv(withDbFields());
    expect(env.DB_HOST).toBe('127.0.0.1');
    expect(env.DB_PORT).toBe('5433');
    expect(env.DB_DATABASE).toBe('pedidos');
    expect(env.DB_USERNAME).toBe('pedidos');
    expect(env.DB_PASSWORD).toBe('pedidos');
    expect(env.DB_SSL).toBe(false);
  });

  it('prefers the DB_* group over DATABASE_URL', () => {
    const env = validateEnv(withDbFields({ DATABASE_URL: withDatabaseUrl().DATABASE_URL }));
    expect(env.DB_HOST).toBe('127.0.0.1');
    expect(env.DB_PORT).toBe('5433');
  });
});

describe('validateEnv — failure reporting', () => {
  it('reports every missing field at once, not just the first', () => {
    let issues = '';
    try {
      validateEnv({});
    } catch (err) {
      expect(err).toBeInstanceOf(EnvValidationError);
      issues = (err as Error).message;
    }
    for (const field of [
      'JWT_SECRET',
      'VAPID_SUBJECT',
      'VAPID_PUBLIC_KEY',
      'VAPID_PRIVATE_KEY',
      'WEB_ORIGIN',
    ]) {
      expect(issues).toContain(field);
    }
  });

  it('still rejects a JWT_SECRET that is too short', () => {
    expect(() => validateEnv(withDatabaseUrl({ JWT_SECRET: 'short' }))).toThrow(
      EnvValidationError,
    );
  });

  it('still rejects a WEB_ORIGIN without a protocol', () => {
    expect(() => validateEnv(withDatabaseUrl({ WEB_ORIGIN: 'localhost' }))).toThrow(
      EnvValidationError,
    );
  });

  it('still rejects a DB_PORT outside the valid range', () => {
    expect(() => validateEnv(withDbFields({ DB_PORT: '99999' }))).toThrow(
      EnvValidationError,
    );
  });

  it('names the missing database fields as an env problem, not a crash', () => {
    let issues = '';
    try {
      validateEnv({
        JWT_SECRET: 'a-secret-long-enough-for-validation',
        VAPID_SUBJECT: 'mailto:admin@example.com',
        VAPID_PUBLIC_KEY: withDatabaseUrl().VAPID_PUBLIC_KEY,
        VAPID_PRIVATE_KEY: withDatabaseUrl().VAPID_PRIVATE_KEY,
        WEB_ORIGIN: 'http://localhost:5173',
      });
    } catch (err) {
      issues = (err as Error).message;
    }
    expect(issues).toContain('DATABASE_URL');
    expect(issues).toContain('DB_HOST');
  });

  it('rejects a half-configured DB_* group instead of falling back to DATABASE_URL', () => {
    const partial = withDatabaseUrl();
    delete (partial as Record<string, unknown>).DB_PORT;
    let issues = '';
    try {
      validateEnv({ ...partial, DB_HOST: '127.0.0.1' });
    } catch (err) {
      issues = (err as Error).message;
    }
    expect(issues).toContain('DB_PORT');
  });

  it('rejects a malformed DATABASE_URL', () => {
    expect(() =>
      validateEnv(withDatabaseUrl({ DATABASE_URL: 'not-a-url' })),
    ).toThrow(EnvValidationError);
  });
});