import { Controller, Post, Body, Get, Request, UnauthorizedException, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // ── Login classique ───────────────────────────────────────────
  @Post('login')
  login(@Body() body: any, @Req() req: any) {
    // ✅ Récupérer IP et UserAgent
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.login(body.email, body.password, { ip, userAgent });
  }

  // ── Profile ───────────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  // ── Face Login Auto ───────────────────────────────────────────
  @Post('face-login-auto')
  async faceLoginAuto(@Body('descriptor') descriptor: number[], @Req() req: any) {
    // ✅ Récupérer IP et UserAgent
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.faceLoginAuto(descriptor, { ip, userAgent });
  }

  // ── Face Register ─────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('face-register')
  async faceRegister(@Request() req, @Body('descriptor') descriptor: number[]) {
    if (!req.user) throw new UnauthorizedException('User not authenticated');
    await this.usersService.saveFaceDescriptor(req.user.sub, descriptor);
    return { message: 'FACE_REGISTERED' };
  }
}