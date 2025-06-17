import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  Res,
  UseGuards
} from '@nestjs/common';

import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';

import { GoogleAuthGuard } from '@application/guards/google-auth.guard';
import { AuthService } from '@application/services/auth/auth.service';
import { LoginDto } from '@infrastructure/http/input/dtos/auth/login.dto';
import { RegisterDto } from '@infrastructure/http/input/dtos/auth/register.dto';
import { Response } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('register')
  @ApiOperation({ summary: 'Cadastrar um novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Fazer login com as suas credenciais' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('google/login')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Fazer login com Google' })
  async googleAuth() {

  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiExcludeEndpoint()
  async googleAuthRedirect(@Request() req, @Res() res: Response) {
    const result = await this.authService.googleLogin(req.user);
    const url = `/auth/success?token=${result.accessToken}`
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${url}`;

    res.redirect(redirectUrl);
  }
}