import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { UserRole } from '../../users/user.entity';

export interface JwtUser {
  id: string;
  role: UserRole;
  dni: string;
}

interface RawJwtPayload {
  sub: string;
  role: UserRole;
  dni: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: { cookies?: { auth_token?: string } } | undefined) =>
          req?.cookies?.auth_token ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: RawJwtPayload): JwtUser {
    return { id: payload.sub, role: payload.role, dni: payload.dni };
  }
}