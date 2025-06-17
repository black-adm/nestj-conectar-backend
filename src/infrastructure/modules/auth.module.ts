import { AuthService } from '@application/services/auth/auth.service';
import { AuthController } from '@infrastructure/http/input/controllers/auth/auth.controller';
import { UsersModule } from '@infrastructure/modules/users.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from '../../application/strategies/google.strategy';
import { JwtStrategy } from '../../application/strategies/jwt.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'insecurekey',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule { }