import 'dotenv/config';
import { DataSource } from 'typeorm';
import { loadAndValidateEnvSync } from '../config/validate-env';
import { Ingredient } from '../modules/ingredients/ingredient.entity';
import { Order } from '../modules/orders/order.entity';
import { Product } from '../modules/products/product.entity';
import { PushSubscription } from '../modules/push/push-subscription.entity';
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
  entities: [User, Recipe, Ingredient, Product, Order, PushSubscription],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});