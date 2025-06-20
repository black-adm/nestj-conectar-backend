import { UsersService } from '@application/services/users/users.service';
import { UserRole } from '@domain/users/enums/user-role.enum';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private usersService: UsersService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3333/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback
  ): Promise<any> {
    try {
      const { id, name, emails } = profile;

      let user = await this.usersService.findByGoogleId(id);

      if (user) {
        user.googleId = id;
        await this.usersService.update(user.id, { googleId: id }, user);
      }

      if (!user) {
        user = await this.usersService.create({
          name: `${name.givenName} ${name.familyName}`,
          email: emails[0].value,
          role: UserRole.USER,
          googleId: id,
        });
      }

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}