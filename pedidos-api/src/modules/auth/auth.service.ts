import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { User, type UserRole } from '../users/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

export interface JwtPayload {
  sub: string;
  role: UserRole;
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
    const user = await this.users.findOne({ where: { dni: dto.dni } });
    if (!user) {
      throw new UnauthorizedException('DNI no registrado');
    }
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      dni: user.dni,
    };
    const token = await this.jwt.signAsync(payload);
    return { user, token };
  }

  async register(
    dto: RegisterDto,
  ): Promise<{ user: User; token: string }> {
    const existing = await this.users.findOne({ where: { dni: dto.dni } });
    if (existing) {
      throw new ConflictException('DNI ya registrado');
    }
    const user = this.users.create({
      dni: dto.dni,
      name: dto.name,
      role: 'VENDEDOR',
    });
    const saved = await this.users.save(user);
    const payload: JwtPayload = {
      sub: saved.id,
      role: saved.role,
      dni: saved.dni,
    };
    const token = await this.jwt.signAsync(payload);
    return { user: saved, token };
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
      // Must match how setAuthCookie sets it, or the browser keeps the
      // original cookie. See the note there on why this is `lax` everywhere.
      sameSite: 'lax',
      secure: isProd,
      path: '/',
    });
  }
}