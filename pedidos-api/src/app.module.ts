import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './app.controller';
import { validateEnv } from './config/validate-env';
import { AuthModule } from './modules/auth/auth.module';
import { Ingredient } from './modules/ingredients/ingredient.entity';
import { IngredientsModule } from './modules/ingredients/ingredients.module';
import { Order } from './modules/orders/order.entity';
import { OrdersModule } from './modules/orders/orders.module';
import { Product } from './modules/products/product.entity';
import { ProductsModule } from './modules/products/products.module';
import { PushSubscription } from './modules/push/push-subscription.entity';
import { PushModule } from './modules/push/push.module';
import { RecipeIngredient } from './modules/recipes/recipe-ingredient.entity';
import { Recipe } from './modules/recipes/recipe.entity';
import { RecipesModule } from './modules/recipes/recipes.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { User } from './modules/users/user.entity';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.getOrThrow<string>('DB_HOST'),
        port: parseInt(config.getOrThrow<string>('DB_PORT'), 10),
        database: config.getOrThrow<string>('DB_DATABASE'),
        username: config.getOrThrow<string>('DB_USERNAME'),
        password: config.getOrThrow<string>('DB_PASSWORD'),
        entities: [
          User,
          Recipe,
          RecipeIngredient,
          Ingredient,
          Product,
          Order,
          PushSubscription,
        ],
        synchronize: false,
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: false,
      }),
    }),
    UsersModule,
    AuthModule,
    RecipesModule,
    IngredientsModule,
    ProductsModule,
    OrdersModule,
    SchedulerModule,
    PushModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}