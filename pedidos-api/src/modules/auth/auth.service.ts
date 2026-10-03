import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';

export interface JwtPayload {
  sub: string;
  role: 'VENDEDOR' | 'COMPRADOR';
  dni: string;
}

export const AUTH_COOKIE_NAME = 'auth_token';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(
    dto: LoginDto,
  ): Promise<{ user: User; token: string }> {
    let user = await this.users.findOne({ where: { dni: dto.dni } });
    if (!user) {
      user = this.users.create({
        dni: dto.dni,
        name: dto.name,
        role: 'COMPRADOR',
      });
      user = await this.users.save(user);
    }
    if (user.role !== 'VENDEDOR') {
      throw new ForbiddenException(
        'solo los vendedores pueden iniciar sesión',
      );
    }
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      dni: user.dni,
    };
    const token = await this.jwt.signAsync(payload);
    return { user, token };
  }

  async getMe(userId: string): Promise<User> {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }
    return user;
  }

  logout(res: Response): void {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      path: '/',
    });
  }
}