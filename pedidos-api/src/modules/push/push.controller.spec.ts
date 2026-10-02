import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtUser } from '../auth/strategies/jwt.strategy';
import { PushSubscriptionsService } from './push-subscriptions.service';
import { PushController } from './push.controller';
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined, getRepositoryToken: () => 'PUSH_SUBSCRIPTIONS_REPO' }));
const USER: JwtUser = { id: '11111111-1111-1111-1111-111111111111', role: 'COMPRADOR', dni: '12345678' };
const EP = 'https://fcm.googleapis.com/fcm/send/abc';
const BODY = { endpoint: EP, keys: { p256dh: 'p', auth: 'a' } };
@Injectable()
class FakeAuthGuard implements CanActivate {
  static authed = true;
  canActivate(ctx: ExecutionContext): boolean {
    if (!FakeAuthGuard.authed) throw new UnauthorizedException();
    ctx.switchToHttp().getRequest().user = USER;
    return true;
  }
}
describe('PushController', () => {
  let app: any;
  const subs = { subscribe: jest.fn(), unsubscribe: jest.fn(), listForUser: jest.fn() };
  beforeEach(async () => {
    FakeAuthGuard.authed = true;
    [subs.subscribe, subs.unsubscribe, subs.listForUser].forEach((m) => m.mockReset());
    const mod = await Test.createTestingModule({ controllers: [PushController], providers: [{ provide: PushSubscriptionsService, useValue: subs }] })
      .overrideGuard(JwtAuthGuard).useClass(FakeAuthGuard).compile();
    app = mod.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    await app.init();
  });
  afterEach(async () => { await app.close(); });
  it('returns 401 without auth and 201 on happy path for POST /subscribe', async () => {
    FakeAuthGuard.authed = false;
    const r401 = await request(app.getHttpServer()).post('/api/push/subscribe').send(BODY);
    expect(r401.status).toBe(401);
    expect(subs.subscribe).not.toHaveBeenCalled();
    FakeAuthGuard.authed = true;
    subs.subscribe.mockResolvedValue({ id: 'sub-1', endpoint: EP });
    const r201 = await request(app.getHttpServer()).post('/api/push/subscribe').send(BODY);
    expect(r201.status).toBe(201);
    expect(r201.body).toEqual({ id: 'sub-1', endpoint: EP });
    expect(subs.subscribe).toHaveBeenCalledWith(USER.id, BODY);
  });
  it('reads endpoint from query on DELETE /unsubscribe', async () => {
    subs.unsubscribe.mockResolvedValue(true);
    const r = await request(app.getHttpServer()).delete('/api/push/unsubscribe').query({ endpoint: EP });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ removed: true });
    expect(subs.unsubscribe).toHaveBeenCalledWith(USER.id, EP);
  });
  it('returns only current user subscriptions on GET /mine', async () => {
    const rows = [{ id: 'sub-2' }, { id: 'sub-1' }];
    subs.listForUser.mockResolvedValue(rows);
    const r = await request(app.getHttpServer()).get('/api/push/mine');
    expect(r.status).toBe(200);
    expect(r.body).toEqual(rows);
    expect(subs.listForUser).toHaveBeenCalledWith(USER.id);
  });
});