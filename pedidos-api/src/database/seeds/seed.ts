import 'dotenv/config';
// The User entity below is decorated; a bare `node dist/database/seeds/seed.js`
// does not go through the Nest bootstrap that would otherwise load this.
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { postgresSslOption } from '../../config/database-url';
import { loadAndValidateEnvSync } from '../../config/validate-env';
import { User, UserRole } from '../../modules/users/user.entity';

// Only vendors are seeded. Buyers are anonymous: their data is a snapshot on
// each order, so there is no buyer row to create here.
const VENDORS: Array<Pick<User, 'dni' | 'name'> & { role: UserRole }> = [
  { dni: '11111111', name: 'Ana Pastelera', role: 'VENDEDOR' },
  { dni: '33333333', name: 'Carla Vendedora', role: 'VENDEDOR' },
];

const ALL = [...VENDORS];

// Synchronous top-level validation: throws aggregated EnvValidationError
// listing every missing/invalid field at once when env is incomplete.
const env = loadAndValidateEnvSync();

const ds = new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: parseInt(env.DB_PORT, 10),
  database: env.DB_DATABASE,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  ssl: postgresSslOption(env.DB_SSL),
  entities: [User],
  synchronize: false,
  logging: false,
});

async function main(): Promise<void> {
  await ds.initialize();
  const repo = ds.getRepository(User);
  let created = 0;
  let skipped = 0;
  for (const u of ALL) {
    const existing = await repo.findOne({ where: { dni: u.dni } });
    if (existing) {
      skipped++;
      continue;
    }
    await repo.save(repo.create(u));
    created++;
  }
  console.log(
    `[seed] ${ALL.length} total: ${created} created, ${skipped} already existed.`,
  );
  await ds.destroy();
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});