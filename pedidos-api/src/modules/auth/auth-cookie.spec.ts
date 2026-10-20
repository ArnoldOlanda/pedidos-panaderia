import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthController } from './auth.controller';
import { AUTH_COOKIE_NAME, AuthService } from './auth.service';

// @nestjs/typeorm@12 ships pure ESM, which jest cannot parse. auth.service
// imports it transitively, so it is stubbed here exactly as the other specs
// in this repo do.
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
  getRepositoryToken: () => 'USERS_REPO',
}));

/**
 * The cookie flags are the whole security posture of this endpoint, so they are
 * pinned through the public methods rather than left to a comment.
 *
 * `SameSite=none` exists only for a cross-site setup: a SPA on a different
 * domain than the API. Deploying as a single Railway service where Nest serves
 * both makes every request same-origin, so `lax` is sufficient — and `none`
 * would attach the session cookie to cross-site requests, which is precisely
 * the exposure `lax` removes.
 */

interface CookieCall {
  name: string;
  options: Record<string, unknown>;
}

function recordingResponse(): { res: Response; calls: CookieCall[] } {
  const calls: CookieCall[] = [];
  const res = {
    cookie: (name: string, _value: string, options: Record<string, unknown>) => {
      calls.push({ name, options });
      return res;
    },
    clearCookie: (name: string, options: Record<string, unknown>) => {
      calls.push({ name, options });
      return res;
    },
  } as unknown as Response;
  return { res, calls };
}

function controller(nodeEnv: string) {
  const auth = {
    login: jest.fn().mockResolvedValue({ user: { id: 'u1' }, token: 'jwt' }),
    register: jest.fn().mockResolvedValue({ user: { id: 'u1' }, token: 'jwt' }),
    logout: jest.fn(),
  } as unknown as AuthService;
  const config = { get: jest.fn().mockReturnValue(nodeEnv) } as unknown as ConfigService;
  return new AuthController(auth, config);
}

const VENDOR = { dni: '11111111', name: 'Ana' };

describe('auth cookie flags', () => {
  it('sets SameSite=lax in production, where the API serves the SPA itself', async () => {
    const { res, calls } = recordingResponse();
    await controller('production').login(VENDOR, res);

    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe(AUTH_COOKIE_NAME);
    expect(calls[0].options.sameSite).toBe('lax');
    expect(calls[0].options.secure).toBe(true);
    expect(calls[0].options.httpOnly).toBe(true);
    expect(calls[0].options.path).toBe('/');
  });

  it('sets SameSite=lax outside production too, so the flag never varies', async () => {
    const { res, calls } = recordingResponse();
    await controller('development').login(VENDOR, res);

    expect(calls[0].options.sameSite).toBe('lax');
    expect(calls[0].options.secure).toBe(false);
  });

  it('never sets SameSite=none, which would expose the session to CSRF', async () => {
    for (const env of ['production', 'development']) {
      const { res, calls } = recordingResponse();
      await controller(env).register(VENDOR, res);
      expect(calls[0].options.sameSite).not.toBe('none');
    }
  });

  it('clears the cookie with the same attributes it was set with', () => {
    const { res, calls } = recordingResponse();
    // The real service, so the flags come from auth.service.ts and not from a
    // fake that would only prove the fake is consistent with itself.
    const service = new AuthService(
      {} as never,
      {} as never,
      { get: jest.fn().mockReturnValue('production') } as unknown as ConfigService,
    );
    service.logout(res);

    expect(calls).toHaveLength(1);
    expect(calls[0].name).toBe(AUTH_COOKIE_NAME);
    expect(calls[0].options.sameSite).toBe('lax');
    expect(calls[0].options.secure).toBe(true);
    expect(calls[0].options.path).toBe('/');
  });
});