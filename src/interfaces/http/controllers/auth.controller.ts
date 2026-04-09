import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { LoginUseCase } from '../../../application/use-cases/login.use-case';
import { RegisterUserUseCase } from '../../../application/use-cases/register-user.use-case';
import { LoginDto } from '../../../application/use-cases/dtos/login.dto';
import { RegisterUserDto } from '../../../application/use-cases/dtos/register-user.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUserUseCase: RegisterUserUseCase,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Connexion',
    description: 'Authentifie un utilisateur et retourne un JWT valable 24h. Utilisez ce token dans le header `Authorization: Bearer <token>` pour tous les endpoints protégés.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Connexion réussie',
    schema: {
      example: { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
    },
  })
  @ApiResponse({ status: 401, description: 'Numéro de téléphone ou mot de passe incorrect' })
  async login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Inscription (via /auth)',
    description: 'Alias de `POST /identity/register`. Crée un compte utilisateur. Préférez `/identity/register` pour la cohérence.',
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: 201,
    description: 'Compte créé avec succès (password non retourné)',
    schema: {
      example: {
        id: 'a975e635-282a-4d4f-981d-d1a33f505ec9',
        phone: '+221700000001',
        name: 'Alice Diallo',
        role: 'PASSENGER',
        isVerified: false,
        createdAt: '2026-04-09T06:09:54.607Z',
        updatedAt: '2026-04-09T06:09:54.607Z',
        deletedAt: null,
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Données invalides (format téléphone, champs manquants...)' })
  @ApiResponse({ status: 409, description: 'Ce numéro de téléphone est déjà utilisé' })
  async register(@Body() dto: RegisterUserDto) {
    return this.registerUserUseCase.execute(dto);
  }
}
