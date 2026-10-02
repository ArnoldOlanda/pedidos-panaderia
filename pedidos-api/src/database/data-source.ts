import 'dotenv/config';
import { DataSource } from 'typeorm';
import { loadAndValidateEnvSync } from '../config/validate-env';
import { Order } from '../modules/orders/order.entity';
import { Product } from '../modules/products/product.entity';
import { PushSubscription } from '../modules/push/push-subscription.entity';
import { Recipe } from '../modules/recipes/recipe.entity';
import { User } from '../modules/users/user.entity';

// The typeorm CLI loads this file via typeorm-ts-node-commonjs and expects
// a DataSource instance at import time. Top-level await is unavailable in
// module: commonjs, so we use the synchronous validator and throw eagerly
// when DATABASE_URL (or any other required field) is missing.
const env = loadAndValidateEnvSync();

export default new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  entities: [User, Recipe, Product, Order, PushSubscription],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});