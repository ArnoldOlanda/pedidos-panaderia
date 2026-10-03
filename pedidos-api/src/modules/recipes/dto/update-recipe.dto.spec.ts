import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { UpdateRecipeDto } from './update-recipe.dto';

// Mirrors the global pipe configured in src/main.ts so this spec proves the
// HTTP-visible behavior of a partial patch: every field is optional, so the
// "name-only / no-op patch" path must pass validation untouched.
const pipe = new ValidationPipe({ whitelist: true, transform: true });

const transform = (payload: unknown) =>
  pipe.transform(payload, { type: 'body', metatype: UpdateRecipeDto });

describe('UpdateRecipeDto validation', () => {
  it('passes an empty object and leaves every field undefined', async () => {
    const result = await transform({});

    expect(result).toBeInstanceOf(UpdateRecipeDto);
    expect(result.name).toBeUndefined();
    expect(result.ingredients).toBeUndefined();
    expect(result.utilidad).toBeUndefined();
    expect(result.manoObra).toBeUndefined();
  });

  it('accepts null utilidad and manoObra but keeps them null on the instance', async () => {
    const result = await transform({ utilidad: null, manoObra: null });

    // @IsOptional() skips validation for null too, so null survives the pipe.
    // This is exactly why the service normalizes with `dto.utilidad ?? undefined`
    // instead of trusting the DTO type.
    expect(result.utilidad).toBeNull();
    expect(result.manoObra).toBeNull();
  });

  it('rejects a negative manoObra with BadRequestException', async () => {
    await expect(transform({ manoObra: -5 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects a negative utilidad with BadRequestException', async () => {
    await expect(transform({ utilidad: -1 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('passes a valid partial patch and preserves explicit zero values', async () => {
    const result = await transform({ manoObra: 0, utilidad: 0 });

    expect(result.manoObra).toBe(0);
    expect(result.utilidad).toBe(0);
  });
});
