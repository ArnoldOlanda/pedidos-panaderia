import {
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthService, AUTH_COOKIE_NAME, JwtPayload } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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

  private setAuthCookie(res: Response, token: string): void {
    const isProd = this.config.get<string>('NODE_ENV') === 'production';
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      // `lax` in every environment, not just development. `none` is only
      // needed when the SPA lives on a different origin than the API — which
      // was the plan when this was written (Netlify + Railway). Deploying as a
      // single service means every request is same-origin, so `lax` still
      // carries the session, while `none` would also attach it to requests
      // from any other site.
      sameSite: 'lax',
      secure: isProd,
      path: '/',
      maxAge: SEVEN_DAYS_MS,
    });
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: unknown }> {
    const { user, token } = await this.auth.login(dto);
    this.setAuthCookie(res, token);
    return { user };
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: unknown }> {
    const { user, token } = await this.auth.register(dto);
    this.setAuthCookie(res, token);
    return { user };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    this.auth.logout(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<unknown> {
    try {
      return await this.auth.getMe(req.user.id);
    } catch (err) {
      // Stale cookie: the JWT references a user that no longer exists
      // (e.g. db reset or a regenerated seed). Clear the cookie so the
      // bootstrap treats the next request as anonymous instead of
      // failing with 404.
      if (err instanceof NotFoundException) {
        this.auth.logout(res);
        throw new UnauthorizedException('vendor session no longer valid');
      }
      throw err;
    }
  }
}

// Re-export for downstream modules that need the payload type.
export type { JwtPayload };