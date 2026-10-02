import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import webpush = require('web-push');
import { validateEnv } from '../../config/validate-env';
import { PushSubscriptionsService } from './push-subscriptions.service';
import { WebpushService } from './webpush.service';
jest.mock('web-push', () => ({ setVapidDetails: jest.fn(), sendNotification: jest.fn() }));
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined, getRepositoryToken: () => 'PUSH_SUBSCRIPTIONS_REPO' }));
const UA = '11111111-1111-1111-1111-111111111111';
const EP = 'https://fcm.googleapis.com/fcm/send/one';
const sub = (o = {}) => ({ id: 's', userId: UA, endpoint: EP, p256dh: 'p', auth: 'a', ...o });
describe('WebpushService', () => {
  let service: WebpushService;
  let subscriptions: { listForUser: jest.Mock; unsubscribe: jest.Mock };
  const send = webpush.sendNotification as jest.Mock;
  beforeEach(async () => {
    send.mockReset();
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
    subscriptions = { listForUser: jest.fn(), unsubscribe: jest.fn() };
    const mod = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          validate: validateEnv,
        }),
      ],
      providers: [
        WebpushService,
        { provide: PushSubscriptionsService, useValue: subscriptions },
      ],
    }).compile();
    service = mod.get(WebpushService);
    service.onModuleInit();
  });
  it('sends one notification per subscription and counts deliveries', async () => {
    subscriptions.listForUser.mockResolvedValue([sub({ endpoint: EP }), sub({ endpoint: 'two' })]);
    send.mockResolvedValue({});
    const out = await service.sendToUser(UA, { title: 't', body: 'b' });
    expect(send).toHaveBeenCalledTimes(2);
    expect(out).toEqual({ delivered: 2, removed: 0 });
  });
  it.each([404, 410])('removes stale subscription when webpush returns %i', async (code) => {
    subscriptions.listForUser.mockResolvedValue([sub()]);
    send.mockRejectedValueOnce(Object.assign(new Error('gone'), { statusCode: code }));
    subscriptions.unsubscribe.mockResolvedValue(true);
    const out = await service.sendToUser(UA, { title: 't', body: 'b' });
    expect(subscriptions.unsubscribe).toHaveBeenCalledWith(UA, EP);
    expect(out).toEqual({ delivered: 0, removed: 1 });
  });
  it('tolerates non-stale errors and does not delete the subscription', async () => {
    subscriptions.listForUser.mockResolvedValue([sub()]);
    send.mockRejectedValueOnce(Object.assign(new Error('server error'), { statusCode: 500 }));
    const out = await service.sendToUser(UA, { title: 't', body: 'b' });
    expect(subscriptions.unsubscribe).not.toHaveBeenCalled();
    expect(out).toEqual({ delivered: 0, removed: 0 });
  });
});