import { Logger } from '@nestjs/common';
import { AutoCloseService } from './auto-close.service';
import { ProductsService } from '../products/products.service';
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

describe('AutoCloseService', () => {
  let svc: AutoCloseService;
  const products = { closeExpired: jest.fn() };
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    products.closeExpired.mockReset();
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    svc = new AutoCloseService(products as any);
  });

  afterEach(() => {
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('logs each closed product for observability without sending vendor push', async () => {
    products.closeExpired.mockResolvedValue({
      closedCount: 2,
      closed: [
        product({ id: PRODUCT_A, name: 'Pan de chocolate', createdById: VENDOR_A }),
        product({ id: PRODUCT_B, name: 'Croissant', createdById: VENDOR_B }),
      ],
    });

    await svc.handleCron();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Auto-closed product ${PRODUCT_A}`),
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(`Auto-closed product ${PRODUCT_B}`),
    );
  });

  it('sends no notification when closeExpired reports zero closed', async () => {
    products.closeExpired.mockResolvedValue({ closedCount: 0, closed: [] });

    await svc.handleCron();

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('logs the auto-close error and returns early when closeExpired throws', async () => {
    products.closeExpired.mockRejectedValue(new Error('boom'));

    await expect(svc.handleCron()).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      'Auto-close failed',
      expect.any(Error),
    );
  });
});