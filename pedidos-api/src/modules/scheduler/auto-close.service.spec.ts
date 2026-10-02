import { Logger } from '@nestjs/common';
import { AutoCloseService } from './auto-close.service';
import { ProductsService } from '../products/products.service';
import { WebpushService } from '../push/webpush.service';
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  getRepositoryToken: () => 'PRODUCTS_REPO',
}));

const VENDOR_A = '11111111-1111-1111-1111-111111111111';
const VENDOR_B = '22222222-2222-2222-2222-222222222222';
const PRODUCT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const PRODUCT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

const product = (o: Partial<{ id: string; name: string; createdById: string }> = {}) => ({
  id: PRODUCT_A,
  name: 'Pan de chocolate',
  createdById: VENDOR_A,
  ...o,
});

describe('AutoCloseService — vendor push hooks', () => {
  let svc: AutoCloseService;
  const products = { closeExpired: jest.fn() };
  const webpush = { sendToUser: jest.fn() };
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    products.closeExpired.mockReset();
    webpush.sendToUser.mockReset();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    svc = new AutoCloseService(products as any, webpush as any);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('iterates each closed product and notifies its vendor', async () => {
    products.closeExpired.mockResolvedValue({
      closedCount: 2,
      closed: [
        product({ id: PRODUCT_A, name: 'Pan de chocolate', createdById: VENDOR_A }),
        product({ id: PRODUCT_B, name: 'Croissant', createdById: VENDOR_B }),
      ],
    });
    webpush.sendToUser.mockResolvedValue({ delivered: 1, removed: 0 });

    await svc.handleCron();

    expect(webpush.sendToUser).toHaveBeenCalledTimes(2);
    expect(webpush.sendToUser).toHaveBeenCalledWith(VENDOR_A, {
      title: 'Tu producto se cerró',
      body: 'Pan de chocolate cerró su ventana de pedidos',
      tag: `product-${PRODUCT_A}`,
    });
    expect(webpush.sendToUser).toHaveBeenCalledWith(VENDOR_B, {
      title: 'Tu producto se cerró',
      body: 'Croissant cerró su ventana de pedidos',
      tag: `product-${PRODUCT_B}`,
    });
  });

  it('when sendToUser rejects, handleCron logs but does not throw', async () => {
    products.closeExpired.mockResolvedValue({
      closedCount: 1,
      closed: [product()],
    });
    webpush.sendToUser.mockRejectedValue(new Error('VAPID not configured'));

    await expect(svc.handleCron()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('vendor push loop failed'),
    );
  });

  it('sends no push when closeExpired reports zero closed', async () => {
    products.closeExpired.mockResolvedValue({ closedCount: 0, closed: [] });

    await svc.handleCron();

    expect(webpush.sendToUser).not.toHaveBeenCalled();
  });
});