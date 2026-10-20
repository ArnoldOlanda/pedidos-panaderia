// The module reads and validates env at import time, so it is required (not
// statically imported) after the test env is in place. reflect-metadata is
// needed because the entities below use decorators.
import 'reflect-metadata';
import { readdirSync } from 'fs';
import { join } from 'path';

const BASE_ENV = {
  JWT_SECRET: 'a-secret-long-enough-for-validation',
  VAPID_SUBJECT: 'mailto:admin@example.com',
  VAPID_PUBLIC_KEY:
    'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
  VAPID_PRIVATE_KEY:
    'y8Ko7b2Vx9wQm3ZrTnLpHs5DcFgN1aUeJ4iWqB0xC6vMyD7sKeT3lRhG2oPzXcVn',
  WEB_ORIGIN: 'http://localhost:5173',
};

function loadDataSource(extraEnv: Record<string, string>) {
  jest.resetModules();
  for (const key of Object.keys(process.env)) {
    if (
      key.startsWith('DB_') ||
      key.startsWith('DATABASE_URL') ||
      key.startsWith('VAPID_') ||
      ['JWT_SECRET', 'WEB_ORIGIN'].includes(key)
    ) {
      delete process.env[key];
    }
  }
  // data-source.ts runs `import 'dotenv/config'`, which would otherwise
  // re-populate DB_* from the developer's real .env and silently win over the
  // URL under test. Point dotenv at a path that does not exist so the fixture
  // is the only source of configuration.
  process.env.DOTENV_CONFIG_PATH = '/nonexistent/.env';
  Object.assign(process.env, BASE_ENV, extraEnv);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('./data-source').default;
}

describe('data-source migration paths', () => {
  it('resolves migrations relative to the module, not the process cwd', () => {
    const ds = loadDataSource({ DATABASE_URL: 'postgresql://a:b@localhost:5432/c' });
    const [tsPattern, jsPattern] = ds.options.migrations as string[];

    // Under ts-node this is <pkg>/src/database/migrations, under the compiled
    // output it is <pkg>/dist/database/migrations. Both must work, and both are
    // anchored to the module rather than to wherever the CLI happened to run.
    expect(tsPattern).toBe(join(__dirname, 'migrations', '*.ts'));
    expect(jsPattern).toBe(join(__dirname, 'migrations', '*.js'));
  });

  it('points at the directory the migrations actually live in', () => {
    const ds = loadDataSource({ DATABASE_URL: 'postgresql://a:b@localhost:5432/c' });
    const [tsPattern] = ds.options.migrations as string[];

    const migrationsDir = join(__dirname, 'migrations');
    const sources = readdirSync(migrationsDir).filter((f) => f.endsWith('.ts'));
    expect(sources.length).toBeGreaterThan(0);
    expect(tsPattern.slice(0, migrationsDir.length)).toBe(migrationsDir);
  });
});

describe('data-source connection options', () => {
  it('keeps SSL off for a local connection', () => {
    const ds = loadDataSource({ DATABASE_URL: 'postgresql://a:b@localhost:5432/c' });
    expect(ds.options.ssl).toBe(false);
  });

  it('enables SSL for a hosted URL that asks for it', () => {
    const ds = loadDataSource({
      DATABASE_URL: 'postgresql://a:b@db.railway.app:5432/c?sslmode=require',
    });
    expect(ds.options.ssl).toEqual({ rejectUnauthorized: false });
  });
});