import 'dotenv/config';
// Required because the entities below are decorated. The Nest bootstrap loads
// it too, but this file is also the entry point for the standalone TypeORM CLI
// and for `node dist/database/migrate.js`, neither of which goes through Nest.
import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';
import { postgresSslOption } from '../config/database-url';
import { loadAndValidateEnvSync } from '../config/validate-env';
import { Ingredient } from '../modules/ingredients/ingredient.entity';
import { Order } from '../modules/orders/order.entity';
import { Product } from '../modules/products/product.entity';
import { PushSubscription } from '../modules/push/push-subscription.entity';
import { RecipeIngredient } from '../modules/recipes/recipe-ingredient.entity';
import { Recipe } from '../modules/recipes/recipe.entity';
import { User } from '../modules/users/user.entity';

// The typeorm CLI loads this file via typeorm-ts-node-commonjs and expects
// a DataSource instance at import time. Top-level await is unavailable in
// module: commonjs, so we use the synchronous validator and throw eagerly
// when DB_HOST/PORT/DATABASE/USERNAME/PASSWORD (or any other required
// field) is missing.
const env = loadAndValidateEnvSync();

export default new DataSource({
  type: 'postgres',
  host: env.DB_HOST,
  port: parseInt(env.DB_PORT, 10),
  database: env.DB_DATABASE,
  username: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  ssl: postgresSslOption(env.DB_SSL),
  entities: [
    User,
    Recipe,
    RecipeIngredient,
    Ingredient,
    Product,
    Order,
    PushSubscription,
  ],
  // Anchored to this module rather than to the process cwd, so the same
  // patterns resolve under ts-node (src/database/migrations/*.ts) and under the
  // compiled output (dist/database/migrations/*.js). The deploy's Pre-deploy
  // Command runs the compiled runner, which has no src/ tree next to it.
  migrations: [
    join(__dirname, 'migrations', '*.ts'),
    join(__dirname, 'migrations', '*.js'),
  ],
  synchronize: false,
});