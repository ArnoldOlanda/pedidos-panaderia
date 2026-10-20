import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dataSource from './data-source';

/**
 * Runs every pending migration, then reports what it applied.
 *
 * Exported as a function of its own so it can be unit-tested against a stub
 * DataSource; the CLI wiring below is guarded by `require.main === module` so
 * importing this file never opens a connection.
 *
 * `transaction: 'all'` keeps a partially applied schema impossible: if
 * migration 7 of 8 fails, none of them are recorded as applied.
 *
 * The teardown is unconditional: a failed `initialize()` can leave a connection
 * half-open, and a Pre-deploy Command must not exit holding one.
 */
export async function migrate(ds: DataSource): Promise<string[]> {
  try {
    await ds.initialize();
    const applied = await ds.runMigrations({ transaction: 'all' });
    return applied.map((migration) => migration.name);
  } finally {
    await ds.destroy();
  }
}

if (require.main === module) {
  migrate(dataSource).then(
    (applied) => {
      console.log(
        applied.length === 0
          ? '[migrate] schema already up to date.'
          : `[migrate] applied ${applied.length}: ${applied.join(', ')}`,
      );
    },
    (err) => {
      console.error('[migrate] failed:', err);
      process.exit(1);
    },
  );
}