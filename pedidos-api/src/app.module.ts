import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { Product } from './modules/products/product.entity';
import { ProductsModule } from './modules/products/products.module';
import { Recipe } from './modules/recipes/recipe.entity';
import { RecipesModule } from './modules/recipes/recipes.module';
import { User } from './modules/users/user.entity';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [User, Recipe, Product],
        synchronize: false,
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: false,
      }),
    }),
    UsersModule,
    AuthModule,
    RecipesModule,
    ProductsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}