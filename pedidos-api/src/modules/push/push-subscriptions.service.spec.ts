import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { PushSubscriptionsService } from './push-subscriptions.service';
jest.mock('@nestjs/typeorm', () => ({ InjectRepository: () => () => undefined, getRepositoryToken: () => 'PUSH_SUBSCRIPTIONS_REPO' }));
const UA = '11111111-1111-1111-1111-111111111111', UB = '22222222-2222-2222-2222-222222222222';
const EP = 'https://fcm.googleapis.com/fcm/send/abc', DTO = { endpoint: EP, keys: { p256dh: 'p', auth: 'a' } };
const sub = (o = {}) => ({ id: 's', userId: UA, endpoint: EP, p256dh: 'p', auth: 'a', ...o });
const err23505 = () => new QueryFailedError('q', [], Object.assign(new Error('dup'), { code: '23505' }));
describe('PushSubscriptionsService', () => {
  let svc: PushSubscriptionsService;
  const repo = { findOne: jest.fn(), save: jest.fn(), create: jest.fn(), delete: jest.fn(), find: jest.fn() };
  beforeEach(() => { (Object.values(repo) as jest.Mock[]).forEach((m) => m.mockReset()); svc = new PushSubscriptionsService(repo as any); });
  it('subscribe inserts when endpoint is new', async () => {
    repo.findOne.mockResolvedValue(null); repo.create.mockReturnValue(sub()); repo.save.mockResolvedValue(sub());
    await svc.subscribe(UA, DTO);
    expect(repo.create).toHaveBeenCalledWith({ userId: UA, endpoint: EP, p256dh: 'p', auth: 'a' });
  });
  it('subscribe updates same-user row with new keys', async () => {
    repo.findOne.mockResolvedValue(sub({ p256dh: 'old', auth: 'old' })); repo.save.mockImplementation((s) => s);
    const r = await svc.subscribe(UA, { ...DTO, keys: { p256dh: 'new', auth: 'new' } });
    expect(r.p256dh).toBe('new');
  });
  it('subscribe throws ConflictException for other-user endpoint', async () => {
    repo.findOne.mockResolvedValue(sub({ userId: UB }));
    await expect(svc.subscribe(UA, DTO)).rejects.toBeInstanceOf(ConflictException);
    expect(repo.save).not.toHaveBeenCalled();
  });
  it.each(['insert', 'update'])('subscribe translates 23505 on %s path to ConflictException', async (p) => {
    p === 'insert' ? (repo.findOne.mockResolvedValue(null), repo.create.mockReturnValue(sub())) : repo.findOne.mockResolvedValue(sub());
    repo.save.mockRejectedValue(err23505());
    await expect(svc.subscribe(UA, DTO)).rejects.toBeInstanceOf(ConflictException);
  });
  it('unsubscribe returns boolean from affected count', async () => {
    repo.delete.mockResolvedValueOnce({ affected: 1 }); await expect(svc.unsubscribe(UA, EP)).resolves.toBe(true);
    repo.delete.mockResolvedValueOnce({ affected: 0 }); await expect(svc.unsubscribe(UA, EP)).resolves.toBe(false);
  });
  it('listForUser returns user rows newest first', async () => {
    repo.find.mockResolvedValue([sub()]);
    await svc.listForUser(UA);
    expect(repo.find).toHaveBeenCalledWith({ where: { userId: UA }, order: { updatedAt: 'DESC' } });
  });
});