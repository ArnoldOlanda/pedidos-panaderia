import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { JwtUser } from '../strategies/jwt.strategy';
import type { UserRole } from '../../users/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Array<UserRole>>(
      ROLES_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!required || required.length === 0) return true;
    const req = ctx.switchToHttp().getRequest<{ user?: JwtUser }>();
    const role = req.user?.role;
    if (!role || !required.includes(role)) {
      throw new ForbiddenException(
        `role ${role ?? 'anonymous'} not allowed`,
      );
    }
    return true;
  }
}
