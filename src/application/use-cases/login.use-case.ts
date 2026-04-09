import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { UserRepository } from '../../infrastructure/db/repositories/user.repository';
import { LoginDto } from './dtos/login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(dto: LoginDto): Promise<{ accessToken: string }> {
    const { phone, password } = dto;

    const user = await this.userRepository.findByPhoneWithPassword(phone);

    if (!user || !user.password) {
      throw new UnauthorizedException('Numéro de téléphone ou mot de passe incorrect.');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Numéro de téléphone ou mot de passe incorrect.');
    }

    const payload = { sub: user.id, role: user.role, phone: user.phone };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }
}
