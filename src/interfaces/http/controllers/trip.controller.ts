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
    summary: 'Créer un trajet',
    description: 'Crée un nouveau trajet. Les villes sont normalisées en minuscules. Rôle DRIVER requis.',
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
        departureTime: '2026-04-20T08:00:00.000Z',
        capacity: 4,
        availableSeats: 4,
        price: 2500,
        status: 'ACTIVE',
        version: 1,
        createdAt: '2026-04-09T06:11:07.726Z',
        updatedAt: '2026-04-09T06:11:07.726Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token manquant ou invalide' })
  @ApiResponse({ status: 403, description: 'Rôle DRIVER requis' })
  async create(@Body() dto: CreateTripDto) {
    return this.tripService.create(dto);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Rechercher des trajets',
    description: 'Recherche les trajets ACTIVE pour une date et un itinéraire. Résultats mis en cache 60s. Pagination par curseur : si nextCursor est présent dans la réponse, passez-le dans le paramètre cursor pour obtenir la page suivante.',
  })
  @ApiQuery({ name: 'departureCity', example: 'Dakar', description: 'Ville de départ (insensible à la casse)' })
  @ApiQuery({ name: 'destinationCity', example: 'Thiès', description: 'Ville de destination (insensible à la casse)' })
  @ApiQuery({ name: 'departureTime', example: '2026-04-20', description: 'Date de départ au format YYYY-MM-DD. Retourne tous les trajets de la journée.' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Nombre de résultats par page. Défaut: 10.' })
  @ApiQuery({ name: 'cursor', required: false, description: 'Curseur de pagination. Prendre la valeur nextCursor de la réponse précédente. Omettre pour la première page.' })
  @ApiResponse({
    status: 200,
    description: 'Liste des trajets. Si nextCursor est présent, il y a une page suivante.',
    schema: {
      example: {
        data: [
          {
            id: '9b1ee16a-306b-4ca7-9ae5-25aa25eca9e2',
            departureCity: 'dakar',
            destinationCity: 'thiès',
            departureTime: '2026-04-20T08:00:00.000Z',
            availableSeats: 2,
            price: 2500,
            status: 'ACTIVE',
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
