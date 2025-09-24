import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Song } from '../songs/song.entity';

@Entity('author')
export class Author {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column('date', { nullable: true })
  birthDate: Date;

  @Column('text', { nullable: true })
  bio: string;

  @OneToMany(() => Song, song => song.author)
  songs: Song[];
}
