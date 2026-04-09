import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/guards/roles.guard';
import { Roles } from '../../../infrastructure/auth/decorators/roles.decorator';
import { TripService } from '../../../domains/trip/services/trip.service';
import { CreateTripDto } from '../../../application/use-cases/dtos/create-trip.dto';
import { SearchTripDto } from '../../../application/use-cases/dtos/search-trip.dto';

@ApiTags('Trips')
@Controller('trips')
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Créer un trajet (DRIVER)',
    description: `Crée un nouveau trajet.\n\n` +
      `**Rôle requis : DRIVER**\n\n` +
      `- Les villes sont normalisées en minuscules (ex: "Dakar" → "dakar") pour la cohérence des recherches.\n` +
      `- \`availableSeats\` est initialisé à la valeur de \`capacity\` et décrémenté automatiquement à chaque réservation confirmée.\n` +
      `- Le statut initial est toujours \`ACTIVE\`. Il passe à \`FULL\` quand \`availableSeats = 0\`.`,
  })
  @ApiBody({ type: CreateTripDto })
  @ApiResponse({
    status: 201,
    description: 'Trajet créé',
    schema: {
      example: {
        id: '9b1ee16a-306b-4ca7-9ae5-25aa25eca9e2',
        driverId: 'ebc00913-5d43-4bbd-8a5a-3288fcfb8def',
        departureCity: 'dakar',
        destinationCity: 'thiès',
        departureTime: '2026-04-10T08:00:00.000Z',
        capacity: 4,
        availableSeats: 4,
        price: 2500,
        status: 'ACTIVE',
        version: 1,
        createdAt: '2026-04-09T06:11:07.726Z',
        updatedAt: '2026-04-09T06:11:07.726Z',
        deletedAt: null,
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token manquant ou invalide' })
  @ApiResponse({ status: 403, description: 'Accès refusé — rôle DRIVER requis' })
  async create(@Body() dto: CreateTripDto) {
    return this.tripService.create(dto);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Rechercher des trajets',
    description: `Recherche les trajets actifs pour une date et un itinéraire donnés.\n\n` +
      `**Aucune authentification requise.**\n\n` +
      `- La recherche est insensible à la casse ("Dakar" = "dakar").\n` +
      `- Retourne uniquement les trajets avec \`status = ACTIVE\`.\n` +
      `- Les résultats sont paginés par curseur. Si \`nextCursor\` est présent dans la réponse, passez-le en paramètre \`cursor\` pour obtenir la page suivante.\n` +
      `- Les résultats sont mis en cache 60 secondes (même requête = réponse instantanée).`,
  })
  @ApiQuery({ name: 'departureCity', example: 'Dakar', description: 'Ville de départ' })
  @ApiQuery({ name: 'destinationCity', example: 'Thiès', description: 'Ville de destination' })
  @ApiQuery({ name: 'departureTime', example: '2026-04-10', description: 'Date de départ (YYYY-MM-DD)' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Résultats par page (défaut: 10)' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Curseur de pagination (valeur nextCursor de la réponse précédente)' })
  @ApiResponse({
    status: 200,
    description: 'Liste des trajets trouvés',
    schema: {
      example: {
        data: [
          {
            id: '9b1ee16a-306b-4ca7-9ae5-25aa25eca9e2',
            driverId: 'ebc00913-5d43-4bbd-8a5a-3288fcfb8def',
            departureCity: 'dakar',
            destinationCity: 'thiès',
            departureTime: '2026-04-10T08:00:00.000Z',
            capacity: 4,
            availableSeats: 2,
            price: 2500,
            status: 'ACTIVE',
            version: 2,
            createdAt: '2026-04-09T06:11:07.726Z',
            updatedAt: '2026-04-09T06:14:28.600Z',
            deletedAt: null,
          },
        ],
        nextCursor: '9b1ee16a-306b-4ca7-9ae5-25aa25eca9e2',
      },
    },
  })
  async search(@Query() dto: SearchTripDto) {
    return this.tripService.search(dto);
  }
}
