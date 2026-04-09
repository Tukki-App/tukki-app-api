import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginUseCase } from '../login.use-case';
import { UserRepository } from '../../../infrastructure/db/repositories/user.repository';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));
import * as bcrypt from 'bcrypt';

const mockUser = {
  id: 'user-uuid-1',
  phone: '+221700000001',
  password: '$2b$10$hashedpassword',
  role: 'PASSENGER' as const,
};

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let userRepository: jest.Mocked<UserRepository>;
  let jwtService: jest.Mocked<JwtService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LoginUseCase,
        { provide: UserRepository, useValue: { findByPhoneWithPassword: jest.fn() } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('mock.jwt.token') } },
      ],
    }).compile();

    useCase = module.get(LoginUseCase);
    userRepository = module.get(UserRepository);
    jwtService = module.get(JwtService);
  });

  it('retourne un accessToken si les credentials sont valides', async () => {
    userRepository.findByPhoneWithPassword.mockResolvedValue(mockUser as any);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await useCase.execute({ phone: '+221700000001', password: 'pass1234' });

    expect(result).toEqual({ accessToken: 'mock.jwt.token' });
    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: mockUser.id,
      role: mockUser.role,
      phone: mockUser.phone,
    });
  });

  it('lève UnauthorizedException si l\'utilisateur n\'existe pas', async () => {
    userRepository.findByPhoneWithPassword.mockResolvedValue(null);

    await expect(useCase.execute({ phone: '+221700000099', password: 'pass1234' }))
      .rejects.toThrow(UnauthorizedException);
  });

  it('lève UnauthorizedException si le mot de passe est incorrect', async () => {
    userRepository.findByPhoneWithPassword.mockResolvedValue(mockUser as any);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(useCase.execute({ phone: '+221700000001', password: 'wrongpass' }))
      .rejects.toThrow(UnauthorizedException);
  });
});
