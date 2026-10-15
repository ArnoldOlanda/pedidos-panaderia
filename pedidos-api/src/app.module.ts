import { join } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
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

// Serve the built SPA from `pedidos-api/public/`, populated by the
// `prebuild` script in this package. The dev workflow keeps using the
// Vite proxy at :5173 — when `public/` is absent, serve-static silently
// no-ops and the SPA catch-all in main.ts only fires for routes the
// SPA itself owns, never for /api/* (those are excluded and routed to
// controllers first). The path is `process.cwd()`-relative because
// `start:dev` and `start:prod` both run from inside `pedidos-api/`.
const SPA_DIR = join(process.cwd(), 'public');

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
    ServeStaticModule.forRoot({
      rootPath: SPA_DIR,
      // /api/* keeps going to the Nest controllers; everything else is a
      // candidate for the static handler or the SPA fallback below.
      exclude: ['/api/(.*)'],
      serveStaticOptions: {
        // Default behaviour redirects "/" to "/index.html"; turning that
        // off lets the SPA fallback below decide what "/" should be,
        // which keeps the response shape honest for tooling.
        index: false,
        // fallthrough (default true) means unmatched paths call next()
        // instead of 404-ing in the static middleware itself, so the
        // Express catch-all in main.ts gets to serve index.html.
        fallthrough: true,
      },
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