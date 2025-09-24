// src/auth/oauth-client.entity.ts
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class OAuthClient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  clientId: string;

  @Column()
  clientSecret: string;

  @Column()
  redirectUri: string;

  @Column({ nullable: true })
  name: string;

  @Column('simple-array', { nullable: true })
  scopes: string[];
}
