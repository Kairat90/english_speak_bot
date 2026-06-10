import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async loginWithTelegram(telegramId: string) {
    const user = await this.usersService.findByTelegramId(telegramId);
    const payload = { sub: user.id, telegramId: user.telegramId.toString() };

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }
}
