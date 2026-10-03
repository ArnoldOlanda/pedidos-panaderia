import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService, AUTH_COOKIE_NAME, JwtPayload } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import type { JwtUser } from './strategies/jwt.strategy';

interface AuthedRequest extends Request {
  user: JwtUser;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: unknown }> {
    const { user, token } = await this.auth.login(dto);
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      path: '/',
      maxAge: SEVEN_DAYS_MS,
    });
    return { user };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: false }) res: Response): void {
    this.auth.logout(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: AuthedRequest): Promise<unknown> {
    return this.auth.getMe(req.user.id);
  }

  /**
   * Verification-only endpoint: confirms the role guard correctly
   * accepts VENDEDOR and rejects COMPRADOR. Used by the ODD-1.3
   * smoke check; remove once a real vendor-only route exists.
   */
  @Get('_vendedor-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('VENDEDOR')
  _vendedorOnly(): { ok: true } {
    return { ok: true };
  }
}

// Re-export for downstream modules that need the payload type.
export type { JwtPayload };