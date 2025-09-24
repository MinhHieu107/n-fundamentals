// src/oauth/oauth-client.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OAuthClient } from './oauth-client.entity';
import { User } from 'src/auth/user.entity';

@Injectable()
export class OAuthClientService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(OAuthClient)
    private readonly clientRepo: Repository<OAuthClient>,
  ) {}

  /** Tạo client mới */
  async createClient(data: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    name: string;
    scopes?: string[];
  }): Promise<OAuthClient> {
    const client = this.clientRepo.create({
      ...data,
      scopes: data.scopes || [],
    });
    return this.clientRepo.save(client);
  }

  /** Tìm client theo clientId */
  async findByClientId(clientId: string): Promise<OAuthClient | null> {
    return this.clientRepo.findOne({ where: { clientId } });
  }

  /** Kiểm tra clientId + clientSecret + redirectUri */
  async validateClient(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ): Promise<OAuthClient | null> {
    const client = await this.findByClientId(clientId);
    if (!client) return null;
    if (client.clientSecret !== clientSecret) return null;
    if (client.redirectUri !== redirectUri) return null;
    return client;
  }

  /** Lấy tất cả clients */
  async getAllClients(): Promise<OAuthClient[]> {
    return this.clientRepo.find();
  }
  
}
