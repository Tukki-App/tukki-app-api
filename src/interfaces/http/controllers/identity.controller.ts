import { Controller, Post, Body, Patch, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/guards/roles.guard';
import { Roles } from '../../../infrastructure/auth/decorators/roles.decorator';
import { IdentityService } from '../../../domains/identity/services/identity.service';
import { RegisterUserDto } from '../../../application/use-cases/dtos/register-user.dto';
import { UpdateAvailabilityDto } from '../../../application/use-cases/dtos/update-availability.dto';

@ApiTags('Identity')
@Controller('identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Inscription',
    description: `Crée un nouveau compte utilisateur (passager ou chauffeur).\n\n` +
      `- Si \`role = DRIVER\`, un enregistrement de disponibilité est automatiquement créé (\`isOnline: false\`).\n` +
      `- Le mot de passe est hashé (bcrypt) et jamais retourné dans la réponse.\n` +
      `- Le numéro de téléphone est unique — une 2e inscription avec le même numéro retourne une erreur 409.`,
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: 201,
    description: 'Compte créé avec succès',
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
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 409, description: 'Numéro de téléphone déjà utilisé' })
  async register(@Body() dto: RegisterUserDto) {
    return this.identityService.register(dto);
  }

  @Patch('availability/:driverId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Mettre à jour la disponibilité (DRIVER)',
    description: `Met à jour le statut en ligne/hors ligne du chauffeur.\n\n` +
      `**Rôle requis : DRIVER**\n\n` +
      `- \`isOnline: true\` → le chauffeur apparaît comme disponible pour les passagers\n` +
      `- \`isOnline: false\` → le chauffeur est hors ligne\n\n` +
      `Ce statut est également diffusé en temps réel via WebSocket (namespace \`/availability\`, événement \`availability:updated\`).`,
  })
  @ApiParam({ name: 'driverId', description: 'UUID du chauffeur', example: 'ebc00913-5d43-4bbd-8a5a-3288fcfb8def' })
  @ApiBody({ type: UpdateAvailabilityDto })
  @ApiResponse({
    status: 200,
    description: 'Disponibilité mise à jour',
    schema: {
      example: {
        driverId: 'ebc00913-5d43-4bbd-8a5a-3288fcfb8def',
        isOnline: true,
        lastSeen: '2026-04-09T06:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token manquant ou invalide' })
  @ApiResponse({ status: 403, description: 'Accès refusé — rôle DRIVER requis' })
  @ApiResponse({ status: 404, description: 'Chauffeur introuvable' })
  async updateAvailability(
    @Param('driverId', new ParseUUIDPipe()) driverId: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.identityService.updateAvailability(driverId, dto);
  }
}
