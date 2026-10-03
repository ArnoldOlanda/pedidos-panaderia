import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { validateEnv } from '../../config/validate-env';
import { PushSubscriptionsService } from './push-subscriptions.service';
import { PushController } from './push.controller';
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined, getRepositoryToken: () => 'PUSH_SUBSCRIPTIONS_REPO' }));
const DEVICE = 'device-uuid-1';
const EP = 'https://fcm.googleapis.com/fcm/send/abc';
const BODY = { endpoint: EP, keys: { p256dh: 'p', auth: 'a' }, deviceId: DEVICE };
describe('PushController', () => {
  let app: any;
  const subs = { subscribe: jest.fn(), unsubscribe: jest.fn(), listForDevice: jest.fn() };
  beforeEach(async () => {
    process.env.DB_HOST = 'localhost';
    process.env.DB_PORT = '5432';
    process.env.DB_DATABASE = 'test';
    process.env.DB_USERNAME = 'test';
    process.env.DB_PASSWORD = 'test';
    process.env.JWT_SECRET = 'abcdefghijklmnop';
    process.env.VAPID_SUBJECT = 'mailto:test@example.com';
    process.env.VAPID_PUBLIC_KEY = 'BPubxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    process.env.VAPID_PRIVATE_KEY = 'privxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    process.env.WEB_ORIGIN = 'http://localhost:5173';
    [subs.subscribe, subs.unsubscribe, subs.listForDevice].forEach((m) => m.mockReset());
    const mod = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          validate: validateEnv,
        }),
      ],
      controllers: [PushController],
      providers: [{ provide: PushSubscriptionsService, useValue: subs }],
    }).compile();
    app = mod.createNestApplication({ logger: false });
    app.setGlobalPrefix('api');
    await app.init();
  });
  afterEach(async () => { await app.close(); });
  it('returns 400 without device id in body and 201 on happy path for POST /subscribe', async () => {
    const r400 = await request(app.getHttpServer())
      .post('/api/push/subscribe')
      .send({ endpoint: EP, keys: { p256dh: 'p', auth: 'a' } });
    expect(r400.status).toBe(400);
    expect(subs.subscribe).not.toHaveBeenCalled();
    subs.subscribe.mockResolvedValue({ id: 'sub-1', endpoint: EP });
    const r201 = await request(app.getHttpServer())
      .post('/api/push/subscribe')
      .set('x-device-id', DEVICE)
      .send(BODY);
    expect(r201.status).toBe(201);
    expect(r201.body).toEqual({ id: 'sub-1', endpoint: EP });
    expect(subs.subscribe).toHaveBeenCalledWith(DEVICE, BODY);
  });
  it('reads endpoint from query on DELETE /unsubscribe', async () => {
    subs.unsubscribe.mockResolvedValue(true);
    const r = await request(app.getHttpServer())
      .delete('/api/push/unsubscribe')
      .set('x-device-id', DEVICE)
      .query({ endpoint: EP });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ removed: true });
    expect(subs.unsubscribe).toHaveBeenCalledWith(DEVICE, EP);
  });
  it('returns 400 on DELETE /unsubscribe without device id', async () => {
    const r = await request(app.getHttpServer())
      .delete('/api/push/unsubscribe')
      .query({ endpoint: EP });
    expect(r.status).toBe(400);
    expect(subs.unsubscribe).not.toHaveBeenCalled();
  });
  it('returns only device subscriptions on GET /mine', async () => {
    const rows = [{ id: 'sub-2' }, { id: 'sub-1' }];
    subs.listForDevice.mockResolvedValue(rows);
    const r = await request(app.getHttpServer())
      .get('/api/push/mine')
      .set('x-device-id', DEVICE);
    expect(r.status).toBe(200);
    expect(r.body).toEqual(rows);
    expect(subs.listForDevice).toHaveBeenCalledWith(DEVICE);
  });
  it('returns 400 on GET /mine without device id', async () => {
    const r = await request(app.getHttpServer()).get('/api/push/mine');
    expect(r.status).toBe(400);
    expect(subs.listForDevice).not.toHaveBeenCalled();
  });
});