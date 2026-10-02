import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtUser {
  id: string;
  role: 'VENDEDOR' | 'COMPRADOR';
  dni: string;
}

interface RawJwtPayload {
  sub: string;
  role: 'VENDEDOR' | 'COMPRADOR';
  dni: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: { cookies?: { auth_token?: string } } | undefined) =>
          req?.cookies?.auth_token ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? '',
    });
  }

  validate(payload: RawJwtPayload): JwtUser {
    return { id: payload.sub, role: payload.role, dni: payload.dni };
  }
}