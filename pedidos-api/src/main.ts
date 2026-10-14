import { existsSync } from 'fs';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableCors({
    origin: config.getOrThrow<string>('WEB_ORIGIN'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // SPA history-mode fallback. The static middleware in AppModule already
  // served the real files and let unmatched requests fall through; this
  // catch-all serves `public/index.html` for anything else that did not
  // route to a controller, so deep links like `/catalog/<id>` resolve to
  // the SPA rather than Nest's default 404.
  //
  // Implementing it on Express (not as a wildcard @Controller) sidesteps
  // the `setGlobalPrefix('api')` collision: a Nest @Get('*') would be
  // pre-prefixed into /api/*, but SPA routes own non-/api paths.
  //
  // The `existsSync` guard makes dev-without-an-SPA-build a clean 404
  // rather than a crash; in production the `prebuild` script guarantees
  // the file is present.
  const expressApp = app.getHttpAdapter().getInstance();
  const spaIndex = join(process.cwd(), 'public', 'index.html');
  expressApp.get(/^(?!\/?api(\/|$)).*/, (req: Request, res: Response) => {
    if (!existsSync(spaIndex)) {
      res.status(404).send('Not Found');
      return;
    }
    res.sendFile(spaIndex);
  });

  const port = Number(config.get<string>('PORT') ?? 3000);
  await app.listen(port);
}

void bootstrap();