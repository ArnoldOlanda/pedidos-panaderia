import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateRecipeDto } from './create-recipe.dto';

// Mirrors the global pipe configured in src/main.ts so this spec proves the
// HTTP-visible behavior: an omitted optional field must pass validation and
// stay undefined, letting the service defaults (utilidad 100 / manoObra 20)
// take effect. Before @IsOptional() was added, an omitted field failed with 400.
const pipe = new ValidationPipe({ whitelist: true, transform: true });

const transform = (payload: unknown) =>
  pipe.transform(payload, { type: 'body', metatype: CreateRecipeDto });

const INGREDIENT_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const validPayload = (): Record<string, unknown> => ({
  name: 'Pan de yema',
  ingredients: [{ ingredientId: INGREDIENT_ID, quantityUsed: 1000 }],
});

describe('CreateRecipeDto validation', () => {
  it('passes when utilidad and manoObra are omitted and leaves both undefined', async () => {
    const result = await transform(validPayload());

    expect(result).toBeInstanceOf(CreateRecipeDto);
    expect(result.utilidad).toBeUndefined();
    expect(result.manoObra).toBeUndefined();
  });

  it('preserves explicit utilidad and manoObra values', async () => {
    const result = await transform({
      ...validPayload(),
      utilidad: 100,
      manoObra: 20,
    });

    expect(result.utilidad).toBe(100);
    expect(result.manoObra).toBe(20);
  });

  it('rejects a negative manoObra with BadRequestException', async () => {
    await expect(
      transform({ ...validPayload(), manoObra: -1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a negative utilidad with BadRequestException', async () => {
    await expect(
      transform({ ...validPayload(), utilidad: -1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a non-numeric manoObra with BadRequestException', async () => {
    await expect(
      transform({ ...validPayload(), manoObra: 'x' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts manoObra null but keeps it null on the instance', async () => {
    const result = await transform({ ...validPayload(), manoObra: null });

    // @IsOptional() skips validation for null too, so null survives the pipe.
    // This is exactly why the service normalizes with `dto.manoObra ?? undefined`
    // instead of trusting the DTO type.
    expect(result.manoObra).toBeNull();
  });

  it('strips an unknown extra key thanks to whitelist: true', async () => {
    const result = await transform({ ...validPayload(), surprise: 'x' });

    expect(result).not.toHaveProperty('surprise');
  });
});
