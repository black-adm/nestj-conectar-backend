import {
  ConflictException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';

import { UsersService } from '@application/services/users/users.service';
import { UserRole } from '@domain/users/enums/user-role.enum';
import { LoginDto } from '@infrastructure/http/input/dtos/auth/login.dto';
import { RegisterDto } from '@infrastructure/http/input/dtos/auth/register.dto';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) { }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) throw new ConflictException('Email já está em uso');

    const user = await this.usersService.create({
      ...registerDto,
      role: UserRole.USER,
    });


    return { userId: user.id };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !(await user.validatePassword(loginDto.password))) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    await this.usersService.updateLastLogin(user.id);

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      accessToken: token,
    };
  }

  async googleLogin(user: any) {
    await this.usersService.updateLastLogin(user.id);

    const { ...result } = user;
    const token = this.generateToken(user);

    return {
      user: result,
      accessToken: token,
    };
  }

  private generateToken(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role
    };

    return this.jwtService.sign(payload);
  }
}