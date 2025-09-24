import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SongsModule } from './songs/songs.module';
import { LoggerMiddleware } from './common/middleware/logger/logger.middleware';
import { SongsController } from './songs/songs.controller';
import { DevConfigService } from './common/providers/DevConfigService';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Song } from './songs/song.entity';
import { Author } from './songs/author.entity';
import { AuthModule } from './auth/auth.module';

import { AuthService } from './auth/auth.service';
import { User } from './auth/user.entity';
import { AuthMiddleware } from './common/middleware/logger/auth.middleware';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule,ThrottlerModuleOptions} from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { OauthController } from './oauth/oauth.controller';
import { CallbackController } from './oauth/callback.controller';
import { OAuthClient } from './oauth/oauth-client.entity';
import { OauthModule } from './oauth/oauth.module';
import { OAuthClientService } from './oauth/oauth.service';






const devConfig = {port: 3000}
const proConfig = {port: 4000}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        ttl: config.get('THROTTLE_TTL', 2),
        limit: config.get('THROTTLE_LIMIT', 2),
      }],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      database: 'spotify-clone',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password:'12345678',
      entities: [Song, Author, User, OAuthClient],
      synchronize: true,
}),
    SongsModule,
    AuthModule,
    OauthModule,
  ],
  controllers: [AppController],
  providers: [AppService,
    {
      provide: DevConfigService,
      useClass: DevConfigService,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    
    {
      provide: `CONFIG`,
      useFactory: () =>{
          return process.env.NODE_ENV === `development` ? devConfig: proConfig;
      }
    },
  ],
})
export class AppModule implements NestModule{
  constructor(private dataSource: DataSource){
    console.log('dbName', dataSource.driver.database);
  }

  configure(consumer: MiddlewareConsumer) {
    // consumer.apply(LoggerMiddleware).forRoutes('songs');
    // consumer.apply(LoggerMiddleware).forRoutes({path:'songs', method: RequestMethod.POST});
    consumer.apply(LoggerMiddleware,AuthMiddleware).forRoutes(SongsController);
  }
}
