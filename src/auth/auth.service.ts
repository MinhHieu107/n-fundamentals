// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    @InjectRepository(User)
    private usersRepo: Repository<User>, 
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersRepo.findOne({ where: { username } });
    if (!user) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '2h' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
   async findById(id: number) {
  return this.usersRepo.findOne({ where: { id } });
}

  async register(username: string, password: string) {
    const existingUser = await this.usersRepo.findOne({ where: { username } });
    if (existingUser) return { message: 'User already exists' };

    const hashed = await bcrypt.hash(password, 10);
    const newUser = this.usersRepo.create({ username, password: hashed });
    await this.usersRepo.save(newUser);
    return { message: 'User registered', user: { id: newUser.id, username: newUser.username } };
  }
  async forgotPassword(username: string) {
  const user = await this.usersRepo.findOne({ where: { username } });
  if (!user) return null;
  const resetToken = this.jwtService.sign({ sub: user.id }, { expiresIn: '15m' });
  user.resetToken = resetToken;
  user.resetTokenExp = new Date(Date.now() + 15 * 60 * 1000);
  await this.usersRepo.save(user);

  return resetToken; 
}
async resetPassword(token: string, newPassword: string) {
  return await this.usersRepo.manager.transaction(async (manager) => {   //entityManager
    const payload = this.jwtService.verify(token);
    // find user trong transaction
    const user = await manager.findOne(User, { 
      where: { id: payload.sub, resetToken: token },
      lock: { mode: 'pessimistic_write' } // lock k cho ghi
    }); 
    if (!user) throw new Error('Invalid token');
    if (user.resetTokenExp < new Date()) throw new Error('Token expired');
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = null;
    user.resetTokenExp = null;

    await manager.save(user);

    return true;
  });
}

async validateGoogleUser({ googleId, email, username }) {
  console.log('Google:', { googleId, email, username });
  let user = await this.usersRepo.findOne({ where: { username } });
  console.log(' UserDB:', user); 
  if (!user) {
    user = this.usersRepo.create({ username, password: '', googleId });
    await this.usersRepo.save(user);
     console.log('New User:', user);
  }
  return user;
}


}
