// src/auth/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  // Token reset (tạm thời)
  @Column({ nullable: true })
  resetToken: string;

  @Column({ nullable: true })
  resetTokenExp: Date;

  @Column({ nullable: true })
googleId: string;

}

