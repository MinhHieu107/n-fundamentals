import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Song } from '../songs/song.entity';
import { Author } from '../songs/author.entity';
@Injectable()
export class AuthorService {
  constructor(
    @InjectRepository(Author)
    private authorRepo: Repository<Author>,
  ) {}

  async findSongsByAuthor(authorName: string): Promise<Song[]> {
    const author = await this.authorRepo.findOne({
      where: { name: authorName },
      relations: ['songs'],
    });

    if (!author) return [];
    return author.songs;
  }

  async createAuthor(name: string, birthDate?: Date, bio?: string) {
    const author = this.authorRepo.create({ name, birthDate, bio });
    return this.authorRepo.save(author);
  }
}
