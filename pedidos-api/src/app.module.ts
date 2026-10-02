import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { Order } from './modules/orders/order.entity';
import { OrdersModule } from './modules/orders/orders.module';
import { Product } from './modules/products/product.entity';
import { ProductsModule } from './modules/products/products.module';
import { PushSubscription } from './modules/push/push-subscription.entity';
import { PushModule } from './modules/push/push.module';
import { Recipe } from './modules/recipes/recipe.entity';
import { RecipesModule } from './modules/recipes/recipes.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { User } from './modules/users/user.entity';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [User, Recipe, Product, Order, PushSubscription],
        synchronize: false,
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: false,
      }),
    }),
    UsersModule,
    AuthModule,
    RecipesModule,
    ProductsModule,
    OrdersModule,
    SchedulerModule,
    PushModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}