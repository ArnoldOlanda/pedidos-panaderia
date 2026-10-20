import { DataSource } from 'typeorm';
import { migrate } from './migrate';

// migrate.ts imports the real data-source, which validates env at import time.
// The unit under test never touches it, so it is stubbed out entirely.
jest.mock('./data-source', () => ({ __esModule: true, default: {} }));

function fakeDataSource(applied: string[]) {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    runMigrations: jest.fn().mockResolvedValue(
      applied.map((name) => ({ name })),
    ),
    destroy: jest.fn().mockResolvedValue(undefined),
  } as unknown as DataSource & {
    initialize: jest.Mock;
    runMigrations: jest.Mock;
    destroy: jest.Mock;
  };
}

describe('migrate', () => {
  it('initialises, runs the pending migrations, and closes the connection', async () => {
    const ds = fakeDataSource(['1700000000000-InitUsers']);
    const applied = await migrate(ds);

    expect(ds.initialize).toHaveBeenCalledTimes(1);
    expect(ds.runMigrations).toHaveBeenCalledTimes(1);
    expect(ds.destroy).toHaveBeenCalledTimes(1);
    expect(applied).toEqual(['1700000000000-InitUsers']);
  });

  it('runs every migration inside one transaction', async () => {
    const ds = fakeDataSource([]);
    await migrate(ds);
    expect(ds.runMigrations).toHaveBeenCalledWith({ transaction: 'all' });
  });

  it('reports nothing applied when the schema is already current', async () => {
    const ds = fakeDataSource([]);
    await expect(migrate(ds)).resolves.toEqual([]);
  });

  it('closes the connection even when running migrations fails', async () => {
    const ds = fakeDataSource([]);
    (ds.runMigrations as jest.Mock).mockRejectedValue(
      new Error('relation does not exist'),
    );

    await expect(migrate(ds)).rejects.toThrow('relation does not exist');
    expect(ds.destroy).toHaveBeenCalledTimes(1);
  });

  it('closes the connection when initialise itself fails', async () => {
    const ds = fakeDataSource([]);
    (ds.initialize as jest.Mock).mockRejectedValue(
      new Error('ECONNREFUSED 127.0.0.1:5432'),
    );

    await expect(migrate(ds)).rejects.toThrow('ECONNREFUSED');
    expect(ds.destroy).toHaveBeenCalledTimes(1);
  });
});