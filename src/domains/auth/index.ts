import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../../infrastructure/auth/strategies/jwt.strategy';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret-here-only-for-dev',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  providers: [JwtStrategy, LoginUseCase, RegisterUserUseCase],
  exports: [JwtModule, PassportModule, JwtStrategy, LoginUseCase, RegisterUserUseCase],
})
export class AuthModule {}
