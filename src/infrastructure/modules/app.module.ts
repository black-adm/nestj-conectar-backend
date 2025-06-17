import { AuthModule } from '@infrastructure/modules/auth.module';
import { UsersModule } from '@infrastructure/modules/users.module';
import { DatabaseModule } from '@infrastructure/persistence/database/database.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule { }
