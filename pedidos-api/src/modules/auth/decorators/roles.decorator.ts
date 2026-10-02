import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (
  ...roles: Array<'VENDEDOR' | 'COMPRADOR'>
): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);