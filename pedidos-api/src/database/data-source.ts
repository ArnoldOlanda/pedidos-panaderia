import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Recipe } from '../modules/recipes/recipe.entity';
import { User } from '../modules/users/user.entity';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, Recipe],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});
