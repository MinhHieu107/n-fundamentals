import { Module } from '@nestjs/common';
import { SongsController } from './songs.controller';
import { SongsService } from './songs.service';
import { connection, Connection } from 'src/common/constatnts/connection';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Song } from './song.entity';
import { Author } from './author.entity';
import { AuthorController } from './author.controller';
import { AuthorService } from './author.service';


@Module({
  imports: [TypeOrmModule.forFeature([Song, Author])],
  controllers: [SongsController, AuthorController],
  providers: [SongsService, AuthorService,
 
 {
  provide: 'CONNECTION',  
  useValue: connection,
 }
  ],
  exports : [SongsService, AuthorService]
})
export class SongsModule {}
