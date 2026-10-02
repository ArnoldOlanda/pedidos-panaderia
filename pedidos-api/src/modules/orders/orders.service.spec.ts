import { Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { WebpushService } from '../push/webpush.service';
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  getRepositoryToken: () => 'ORDERS_REPO',
}));

const BUYER = '11111111-1111-1111-1111-111111111111';
const VENDOR = '22222222-2222-2222-2222-222222222222';
const ORDER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PRODUCT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const product = (o: Partial<{ id: string; name: string; createdById: string }> = {}) => ({
  id: PRODUCT_ID,
  name: 'Pan de chocolate',
  createdById: VENDOR,
  ...o,
});

const order = (o: Partial<{ id: string; status: 'PENDIENTE' | 'LISTO' | 'ENTREGADO'; product: ReturnType<typeof product>; userId: string }> = {}) => ({
  id: ORDER_ID,
  status: 'PENDIENTE' as const,
  product: product(),
  userId: BUYER,
  ...o,
});

describe('OrdersService — push hooks', () => {
  let svc: OrdersService;
  const orders = { findOne: jest.fn(), save: jest.fn() };
  const products = {};
  const webpush = { sendToUser: jest.fn() };
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    orders.findOne.mockReset();
    orders.save.mockReset();
    webpush.sendToUser.mockReset();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    svc = new OrdersService(orders as any, products as any, webpush as any);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('updateStatus(LISTO) sends one push to the buyer with the expected payload', async () => {
    orders.findOne.mockResolvedValue(order());
    orders.save.mockImplementation(async (o: any) => o);
    webpush.sendToUser.mockResolvedValue({ delivered: 1, removed: 0 });

    const saved = await svc.updateStatus(ORDER_ID, 'LISTO', VENDOR);

    expect(saved.status).toBe('LISTO');
    expect(webpush.sendToUser).toHaveBeenCalledTimes(1);
    expect(webpush.sendToUser).toHaveBeenCalledWith(BUYER, {
      title: 'Tu pedido está listo',
      body: 'Pasá a recoger tu pedido de Pan de chocolate',
      tag: `order-${ORDER_ID}`,
    });
  });

  it('updateStatus(ENTREGADO) does NOT call webpush', async () => {
    orders.findOne.mockResolvedValue(order({ status: 'LISTO' }));
    orders.save.mockImplementation(async (o: any) => o);

    const saved = await svc.updateStatus(ORDER_ID, 'ENTREGADO', VENDOR);

    expect(saved.status).toBe('ENTREGADO');
    expect(webpush.sendToUser).not.toHaveBeenCalled();
  });

  it('when sendToUser rejects, updateStatus still returns the saved order', async () => {
    orders.findOne.mockResolvedValue(order());
    orders.save.mockImplementation(async (o: any) => o);
    webpush.sendToUser.mockRejectedValue(new Error('VAPID not configured'));

    const saved = await svc.updateStatus(ORDER_ID, 'LISTO', VENDOR);

    expect(saved.status).toBe('LISTO');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`push notify failed for order ${ORDER_ID}`),
    );
  });
});