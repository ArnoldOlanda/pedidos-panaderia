import { Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { WebpushService } from '../push/webpush.service';
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  getRepositoryToken: () => 'ORDERS_REPO',
}));

const DEVICE_ID = '11111111-1111-1111-1111-111111111111';
const VENDOR = '22222222-2222-2222-2222-222222222222';
const ORDER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PRODUCT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const product = (o: Partial<{ id: string; name: string; createdById: string; closed: boolean; closesAt: Date }> = {}) => ({
  id: PRODUCT_ID,
  name: 'Pan de chocolate',
  createdById: VENDOR,
  closed: false,
  closesAt: new Date(Date.now() + 60 * 60 * 1000),
  ...o,
});

const order = (o: Partial<{
  id: string;
  status: 'PENDIENTE' | 'LISTO' | 'ENTREGADO';
  product: ReturnType<typeof product>;
  buyerDni: string;
  buyerDeviceId: string;
}> = {}) => ({
  id: ORDER_ID,
  status: 'PENDIENTE' as const,
  product: product(),
  buyerDni: '12345678',
  buyerDeviceId: DEVICE_ID,
  ...o,
});

const baseDto = () => ({
  productId: PRODUCT_ID,
  quantity: 2,
  buyerDni: '12345678',
  buyerName: 'Bruno',
  buyerApellidos: 'Comprador',
  buyerCarrera: 'Ingeniería',
  buyerDeviceId: DEVICE_ID,
});

describe('OrdersService', () => {
  let svc: OrdersService;
  const orders = { findOne: jest.fn(), save: jest.fn(), find: jest.fn(), create: jest.fn() };
  const products = { findOne: jest.fn() };
  const webpush = { sendToDevice: jest.fn() };
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    orders.findOne.mockReset();
    orders.save.mockReset();
    orders.find.mockReset();
    orders.create.mockReset();
    products.findOne.mockReset();
    webpush.sendToDevice.mockReset();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    svc = new OrdersService(orders as any, products as any, webpush as any);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('create', () => {
    it('persists the buyer snapshot and returns the saved order', async () => {
      const dto = baseDto();
      products.findOne.mockResolvedValue(product());
      orders.create.mockImplementation((o: any) => o);
      orders.save.mockImplementation(async (o: any) => o);

      const saved = await svc.create(dto);

      expect(products.findOne).toHaveBeenCalledWith({ where: { id: dto.productId } });
      expect(orders.create).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: dto.productId,
          buyerDni: dto.buyerDni,
          buyerName: dto.buyerName,
          buyerApellidos: dto.buyerApellidos,
          buyerCarrera: dto.buyerCarrera,
          buyerDeviceId: dto.buyerDeviceId,
          quantity: dto.quantity,
          status: 'PENDIENTE',
        }),
      );
      expect(saved.buyerDni).toBe(dto.buyerDni);
      expect(saved.buyerDeviceId).toBe(dto.buyerDeviceId);
    });
  });

  describe('listByDni', () => {
    it('returns orders filtered by buyerDni ordered by createdAt DESC', async () => {
      const rows = [order(), order({ id: 'other' })];
      orders.find.mockResolvedValue(rows);

      const result = await svc.listByDni('12345678');

      expect(orders.find).toHaveBeenCalledWith({
        where: { buyerDni: '12345678' },
        order: { createdAt: 'DESC' },
        relations: { product: true },
      });
      expect(result).toEqual(rows);
    });
  });

  describe('updateStatus (LISTO push hooks)', () => {
    it('sends one push to the buyer device with the expected payload', async () => {
      orders.findOne.mockResolvedValue(order());
      orders.save.mockImplementation(async (o: any) => o);
      webpush.sendToDevice.mockResolvedValue({ delivered: 1, removed: 0 });

      const saved = await svc.updateStatus(ORDER_ID, 'LISTO', VENDOR);

      expect(saved.status).toBe('LISTO');
      expect(webpush.sendToDevice).toHaveBeenCalledTimes(1);
      expect(webpush.sendToDevice).toHaveBeenCalledWith(DEVICE_ID, {
        title: 'Tu pedido está listo',
        body: 'Pasá a recoger tu pedido de Pan de chocolate',
        tag: `order-${ORDER_ID}`,
      });
    });

    it('does NOT call webpush on ENTREGADO transition', async () => {
      orders.findOne.mockResolvedValue(order({ status: 'LISTO' }));
      orders.save.mockImplementation(async (o: any) => o);

      const saved = await svc.updateStatus(ORDER_ID, 'ENTREGADO', VENDOR);

      expect(saved.status).toBe('ENTREGADO');
      expect(webpush.sendToDevice).not.toHaveBeenCalled();
    });

    it('when sendToDevice rejects, updateStatus still returns the saved order', async () => {
      orders.findOne.mockResolvedValue(order());
      orders.save.mockImplementation(async (o: any) => o);
      webpush.sendToDevice.mockRejectedValue(new Error('VAPID not configured'));

      const saved = await svc.updateStatus(ORDER_ID, 'LISTO', VENDOR);

      expect(saved.status).toBe('LISTO');
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`push notify failed for order ${ORDER_ID}`),
      );
    });
  });
});