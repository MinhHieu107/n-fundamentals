// src/oauth/oauth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OauthController } from './oauth.controller';
import { CallbackController } from './callback.controller';
import { OAuthClient } from './oauth-client.entity';
import { User } from '../auth/user.entity';
import { OAuthClientService } from './oauth.service';
import { AuthService } from 'src/auth/auth.service';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, OAuthClient]),
  AuthModule],
  controllers: [OauthController, CallbackController],
  providers: [OAuthClientService],
  exports: [OAuthClientService],
})
export class OauthModule {}
