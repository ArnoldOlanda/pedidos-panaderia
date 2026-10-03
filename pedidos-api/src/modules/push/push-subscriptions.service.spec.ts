import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { PushSubscriptionsService } from './push-subscriptions.service';
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined, getRepositoryToken: () => 'PUSH_SUBSCRIPTIONS_REPO' }));
const DEVICE_A = 'device-a-uuid';
const DEVICE_B = 'device-b-uuid';
const EP = 'https://fcm.googleapis.com/fcm/send/abc';
const DTO = { endpoint: EP, keys: { p256dh: 'p', auth: 'a' }, deviceId: DEVICE_A };
const sub = (o = {}) => ({ id: 's', deviceId: DEVICE_A, endpoint: EP, p256dh: 'p', auth: 'a', ...o });
const err23505 = () => new QueryFailedError('q', [], Object.assign(new Error('dup'), { code: '23505' }));
describe('PushSubscriptionsService', () => {
  let svc: PushSubscriptionsService;
  const repo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), delete: jest.fn(), find: jest.fn() };
  beforeEach(() => {
    (Object.values(repo) as jest.Mock[]).forEach((m) => m.mockReset());
    svc = new PushSubscriptionsService(repo as any);
  });
  it('subscribe inserts when endpoint is new', async () => {
    repo.findOne.mockResolvedValue(null);
    repo.create.mockReturnValue(sub());
    repo.save.mockResolvedValue(sub());
    await svc.subscribe(DEVICE_A, DTO);
    expect(repo.create).toHaveBeenCalledWith({ deviceId: DEVICE_A, endpoint: EP, p256dh: 'p', auth: 'a' });
  });
  it('subscribe updates same-device row with new keys', async () => {
    repo.findOne.mockResolvedValue(sub({ p256dh: 'old', auth: 'old' }));
    repo.save.mockImplementation((s) => s);
    const r = await svc.subscribe(DEVICE_A, { ...DTO, keys: { p256dh: 'new', auth: 'new' } });
    expect(r.p256dh).toBe('new');
  });
  it('subscribe throws ConflictException for other-device endpoint', async () => {
    repo.findOne.mockResolvedValue(sub({ deviceId: DEVICE_B }));
    await expect(svc.subscribe(DEVICE_A, DTO)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });
  it.each(['insert', 'update'])('subscribe translates 23505 on %s path to ConflictException', async (p) => {
    if (p === 'insert') {
      repo.findOne.mockResolvedValue(null);
      repo.create.mockReturnValue(sub());
    } else {
      repo.findOne.mockResolvedValue(sub());
    }
    repo.save.mockRejectedValue(err23505());
    await expect(svc.subscribe(DEVICE_A, DTO)).rejects.toBeInstanceOf(ConflictException);
  });
  it('unsubscribe returns boolean from affected count', async () => {
    repo.delete.mockResolvedValueOnce({ affected: 1 });
    await expect(svc.unsubscribe(DEVICE_A, EP)).resolves.toBe(true);
    repo.delete.mockResolvedValueOnce({ affected: 0 });
    await expect(svc.unsubscribe(DEVICE_A, EP)).resolves.toBe(false);
  });
  it('listForDevice returns device rows newest first', async () => {
    repo.find.mockResolvedValue([sub()]);
    await svc.listForDevice(DEVICE_A);
    expect(repo.find).toHaveBeenCalledWith({ where: { deviceId: DEVICE_A }, order: { updatedAt: 'DESC' } });
  });
});