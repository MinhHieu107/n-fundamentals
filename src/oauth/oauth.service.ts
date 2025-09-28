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
  // E không hiểu ý lắm, ví dụ ở đây e hiểu mình là oauth mình là bên thứ 3, mình đang có 1 cái APp chẳng hạn và mình muốn cho user đăng nhập bằng oauth của mình
  //Thì cái app này phải đăng kí với Oauth là mình để cho mình biết là nó hợp lệ, sau này đăng nhập cái app đó thì có thể qa oauth của mình, thì e đang hình dung nó như v
  
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
