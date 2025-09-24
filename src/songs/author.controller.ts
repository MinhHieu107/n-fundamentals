import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { AuthorService } from '../songs/author.service';
import { Song } from '../songs/song.entity';

@Controller('authors')
export class AuthorController {
  constructor(private readonly authorService: AuthorService) {}

  @Get(':name/songs')
  getSongsByAuthor(@Param('name') name: string): Promise<Song[]> {
    return this.authorService.findSongsByAuthor(name);
  }

  @Post()
  createAuthor(
    @Body('name') name: string,
    @Body('birthDate') birthDate?: Date,
    @Body('bio') bio?: string,
  ) {
    return this.authorService.createAuthor(name, birthDate, bio);
  }
}
