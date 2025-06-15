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

import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';

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

  @Get('google')
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