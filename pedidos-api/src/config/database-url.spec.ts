import {
  DatabaseConfigError,
  parseDatabaseUrl,
  postgresSslOption,
  resolveDatabaseConfig,
} from './database-url';

describe('parseDatabaseUrl', () => {
  it('splits a full postgres URL into connection fields', () => {
    expect(
      parseDatabaseUrl('postgresql://ana:hunter2@db.railway.app:5432/railway'),
    ).toEqual({
      host: 'db.railway.app',
      port: 5432,
      database: 'railway',
      username: 'ana',
      password: 'hunter2',
      ssl: false,
    });
  });

  it('defaults the port to 5432 when the URL omits it', () => {
    const parsed = parseDatabaseUrl('postgresql://ana:hunter2@localhost/pedidos');
    expect(parsed.port).toBe(5432);
  });

  it('accepts the postgres:// scheme as well as postgresql://', () => {
    const parsed = parseDatabaseUrl('postgres://ana:hunter2@localhost:5432/pedidos');
    expect(parsed.database).toBe('pedidos');
  });

  it('percent-decodes credentials', () => {
    const parsed = parseDatabaseUrl(
      'postgresql://ana%40co:p%40ss%2Fword@localhost:5432/pedidos',
    );
    expect(parsed.username).toBe('ana@co');
    expect(parsed.password).toBe('p@ss/word');
  });

  it.each(['require', 'verify-ca', 'verify-full'])(
    'enables SSL for sslmode=%s',
    (mode) => {
      const parsed = parseDatabaseUrl(
        `postgresql://ana:hunter2@localhost:5432/pedidos?sslmode=${mode}`,
      );
      expect(parsed.ssl).toBe(true);
    },
  );

  it('disables SSL for sslmode=disable', () => {
    const parsed = parseDatabaseUrl(
      'postgresql://ana:hunter2@localhost:5432/pedidos?sslmode=disable',
    );
    expect(parsed.ssl).toBe(false);
  });

  it('ignores unrelated query parameters', () => {
    const parsed = parseDatabaseUrl(
      'postgresql://ana:hunter2@localhost:5432/pedidos?application_name=railway',
    );
    expect(parsed.database).toBe('pedidos');
    expect(parsed.ssl).toBe(false);
  });

  it.each([
    ['has no scheme', 'db.railway.app:5432/railway'],
    ['uses an unsupported scheme', 'mysql://ana:hunter2@localhost:5432/pedidos'],
    ['has no host', 'postgresql://ana:hunter2@/pedidos'],
    ['has no database', 'postgresql://ana:hunter2@localhost:5432'],
    ['has no username', 'postgresql://@localhost:5432/pedidos'],
    ['has a non-numeric port', 'postgresql://ana:hunter2@localhost:abc/pedidos'],
    ['is empty', ''],
  ])('rejects a URL that %s', (_reason, raw) => {
    expect(() => parseDatabaseUrl(raw)).toThrow(DatabaseConfigError);
  });
});

describe('resolveDatabaseConfig', () => {
  const fromUrl = {
    DATABASE_URL: 'postgresql://ana:hunter2@db.railway.app:5432/railway',
  };

  it('uses DATABASE_URL when no DB_* field is set', () => {
    expect(resolveDatabaseConfig(fromUrl)).toEqual({
      host: 'db.railway.app',
      port: 5432,
      database: 'railway',
      username: 'ana',
      password: 'hunter2',
      ssl: false,
    });
  });

  it('prefers DB_* when both sources are present', () => {
    expect(
      resolveDatabaseConfig({
        ...fromUrl,
        DB_HOST: '127.0.0.1',
        DB_PORT: '5433',
        DB_DATABASE: 'pedidos',
        DB_USERNAME: 'pedidos',
        DB_PASSWORD: 'pedidos',
      }),
    ).toEqual({
      host: '127.0.0.1',
      port: 5433,
      database: 'pedidos',
      username: 'pedidos',
      password: 'pedidos',
      ssl: false,
    });
  });

  it('accepts an empty DB_PASSWORD for trust-auth setups', () => {
    const config = resolveDatabaseConfig({
      DB_HOST: '127.0.0.1',
      DB_PORT: '5433',
      DB_DATABASE: 'pedidos',
      DB_USERNAME: 'pedidos',
      DB_PASSWORD: '',
    });
    expect(config.password).toBe('');
  });

  it('forces SSL on when DB_SSL is truthy', () => {
    const config = resolveDatabaseConfig({
      DB_HOST: 'db.railway.app',
      DB_PORT: '5432',
      DB_DATABASE: 'railway',
      DB_USERNAME: 'ana',
      DB_PASSWORD: 'hunter2',
      DB_SSL: 'true',
    });
    expect(config.ssl).toBe(true);
  });

  it('reads DB_SSL=1 as truthy', () => {
    const config = resolveDatabaseConfig({
      DB_HOST: 'db.railway.app',
      DB_PORT: '5432',
      DB_DATABASE: 'railway',
      DB_USERNAME: 'ana',
      DB_PASSWORD: 'hunter2',
      DB_SSL: '1',
    });
    expect(config.ssl).toBe(true);
  });

  it('rejects a partial DB_* set instead of silently falling back', () => {
    expect(() =>
      resolveDatabaseConfig({ ...fromUrl, DB_HOST: '127.0.0.1' }),
    ).toThrow(DatabaseConfigError);
  });

  it('names every missing DB_* field in one aggregated error', () => {
    let message = '';
    try {
      resolveDatabaseConfig({ DB_HOST: '127.0.0.1' });
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('DB_PORT');
    expect(message).toContain('DB_DATABASE');
    expect(message).toContain('DB_USERNAME');
    expect(message).toContain('DB_PASSWORD');
  });

  it('lets DB_SSL force SSL on for the DATABASE_URL path too', () => {
    const config = resolveDatabaseConfig({ ...fromUrl, DB_SSL: 'true' });
    expect(config.ssl).toBe(true);
  });

  it('accepts an already-normalised boolean DB_SSL', () => {
    const config = resolveDatabaseConfig({
      DB_HOST: 'db.railway.app',
      DB_PORT: '5432',
      DB_DATABASE: 'railway',
      DB_USERNAME: 'ana',
      DB_PASSWORD: 'hunter2',
      DB_SSL: true,
    });
    expect(config.ssl).toBe(true);
  });

  it('rejects an env with no database configuration at all', () => {
    expect(() => resolveDatabaseConfig({})).toThrow(DatabaseConfigError);
  });

  it('names both accepted sources when nothing is configured', () => {
    let message = '';
    try {
      resolveDatabaseConfig({});
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('DATABASE_URL');
    expect(message).toContain('DB_HOST');
  });
});

describe('postgresSslOption', () => {
  it('relaxes peer verification when SSL is on', () => {
    expect(postgresSslOption(true)).toEqual({ rejectUnauthorized: false });
  });

  it('passes through plaintext when SSL is off', () => {
    expect(postgresSslOption(false)).toBe(false);
  });
});