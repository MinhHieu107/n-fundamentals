import { Column, Entity, ManyToOne, PrimaryColumn, PrimaryGeneratedColumn } from "typeorm";
import { Author } from "./author.entity";

@Entity('songs')
export class Song{
  @PrimaryGeneratedColumn()
  id: number;
  @Column()
  title: string;
  @Column('varchar', {array: true})
  artists: string[];
  @Column('date', { name: 'released_date' })
releasedDate: Date;
  @Column('time')
  duration: Date;
  @Column("text")
  lyrics: string;
  @ManyToOne(() => Author, author => author.songs)
  author: Author; // nhiều bài hát thuộc 1 tác giả
}