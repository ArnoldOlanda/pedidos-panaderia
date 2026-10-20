// Pins why `await app.init()` must run before the SPA catch-all is registered:
// Express evaluates middleware in registration order, and ServeStaticModule
// only registers its middleware during init. Registering first shadows every
// asset behind index.html (bug fixed in d714ed1).
//
// Known limit: this exercises a miniature replica of the wiring in main.ts,
// which cannot be booted without a live database. It pins the *mechanism*;
// a regression in the literal main.ts sequence would not fail this spec.
import 'reflect-metadata';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { Controller, Get, Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import type { Request, Response } from 'express';
import * as request from 'supertest';

const TMP_ROOT = mkdtempSync(join(tmpdir(), 'spa-order-'));
const SPA = join(TMP_ROOT, 'public');
mkdirSync(SPA, { recursive: true });
writeFileSync(join(SPA, 'index.html'), '<!doctype html><title>spa</title>');
writeFileSync(join(SPA, 'sw.js'), '/* sw */');
const SPA_INDEX = join(SPA, 'index.html');

afterAll(() => rmSync(TMP_ROOT, { recursive: true, force: true }));

@Controller()
class ProbeController {
  @Get('api/health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: SPA,
      exclude: ['/api/(.*)'],
      serveStaticOptions: { index: false, fallthrough: true },
    }),
  ],
  controllers: [ProbeController],
})
class ProbeModule {}

const catchAll = (expressApp: { get: (p: RegExp, h: unknown) => void }) => {
  expressApp.get(/^(?!\/?api(\/|$)).*/, (_req: Request, res: Response) => {
    res.sendFile(SPA_INDEX);
  });
};

async function boot(initFirst: boolean) {
  const app = await NestFactory.create(ProbeModule, { logger: false });
  const expressApp = app.getHttpAdapter().getInstance() as {
    get: (p: RegExp, h: unknown) => void;
  };
  if (initFirst) {
    await app.init();
    catchAll(expressApp);
  } else {
    catchAll(expressApp);
  }
  await app.listen(0);
  return app;
}

describe('SPA catch-all vs ServeStaticModule ordering', () => {
  it('catch-all registered BEFORE init (the bug) swallows every asset', async () => {
    const app = await boot(false);
    try {
      await request(app.getHttpServer())
        .get('/sw.js')
        .expect('Content-Type', /text\/html/);
    } finally {
      await app.close();
    }
  });

  it('catch-all registered AFTER init serves assets with their real type', async () => {
    const app = await boot(true);
    try {
      await request(app.getHttpServer())
        .get('/api/health')
        .expect(200)
        .expect('Content-Type', /application\/json/);
      await request(app.getHttpServer())
        .get('/sw.js')
        .expect(200)
        .expect('Content-Type', /javascript/);
      await request(app.getHttpServer())
        .get('/catalog')
        .expect(200)
        .expect('Content-Type', /text\/html/);
    } finally {
      await app.close();
    }
  });
});