import { Controller, Post, Get, Patch, Body, Param, ParseUUIDPipe, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/guards/roles.guard';
import { Roles } from '../../../infrastructure/auth/decorators/roles.decorator';
import { BookingService } from '../../../domains/booking/services/booking.service';
import { CreateBookingDto } from '../../../application/use-cases/dtos/create-booking.dto';
import { UpdateBookingStatusDto } from '../../../application/use-cases/dtos/update-booking-status.dto';

interface RequestWithUser extends ExpressRequest {
  user: { userId: string; role: 'PASSENGER' | 'DRIVER'; phone: string };
}

const bookingExample = {
  id: '16a0e9eb-1823-4d81-a8d1-3dabba946d15',
  tripId: '9b1ee16a-306b-4ca7-9ae5-25aa25eca9e2',
  passengerId: 'a975e635-282a-4d4f-981d-d1a33f505ec9',
  seats: 2,
  status: 'PENDING',
  idempotencyKey: 'unique-key-abc-123',
  createdAt: '2026-04-09T06:14:28.600Z',
  updatedAt: '2026-04-09T06:14:28.600Z',
  deletedAt: null,
};

@ApiTags('Bookings')
@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PASSENGER')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Créer une réservation (PASSENGER)',
    description: `Réserve des places sur un trajet.\n\n` +
      `**Rôle requis : PASSENGER**\n\n` +
      `- Le statut initial est toujours \`PENDING\` — le chauffeur doit confirmer via \`PATCH /bookings/:id/status\`.\n` +
      `- \`availableSeats\` du trajet est décrémenté immédiatement à la création.\n` +
      `- Si le trajet n'a plus assez de places → **409 Conflict**.\n` +
      `- **Idempotence** : fournissez un \`idempotencyKey\` unique (ex: UUID généré côté mobile). En cas de retry réseau, la même clé retourne la réservation existante sans créer de doublon. Fortement recommandé.`,
  })
  @ApiBody({ type: CreateBookingDto })
  @ApiResponse({
    status: 201,
    description: 'Réservation créée (statut PENDING)',
    schema: { example: bookingExample },
  })
  @ApiResponse({ status: 400, description: 'Trajet non actif ou données invalides' })
  @ApiResponse({ status: 401, description: 'Token manquant ou invalide' })
  @ApiResponse({ status: 403, description: 'Accès refusé — rôle PASSENGER requis' })
  @ApiResponse({ status: 404, description: 'Trajet introuvable' })
  @ApiResponse({ status: 409, description: 'Pas assez de places disponibles' })
  async create(@Body() dto: CreateBookingDto) {
    return this.bookingService.createBooking(dto);
  }

  @Get('my-bookings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('PASSENGER')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Mes réservations (PASSENGER)',
    description: `Retourne toutes les réservations du passager authentifié, triées par date décroissante.\n\n` +
      `**Rôle requis : PASSENGER**\n\n` +
      `Chaque réservation inclut le détail du trajet (\`trip\`) et les infos du chauffeur (\`trip.driver\`).`,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des réservations du passager',
    schema: {
      example: [{
        ...bookingExample,
        trip: {
          id: '9b1ee16a-306b-4ca7-9ae5-25aa25eca9e2',
          departureCity: 'dakar',
          destinationCity: 'thiès',
          departureTime: '2026-04-10T08:00:00.000Z',
          availableSeats: 2,
          price: 2500,
          status: 'ACTIVE',
          driver: {
            id: 'ebc00913-5d43-4bbd-8a5a-3288fcfb8def',
            name: 'Bob',
            phone: '+221700000002',
          },
        },
      }],
    },
  })
  @ApiResponse({ status: 401, description: 'Token manquant ou invalide' })
  @ApiResponse({ status: 403, description: 'Accès refusé — rôle PASSENGER requis' })
  async getMyBookings(@Request() req: RequestWithUser) {
    return this.bookingService.getMyBookings(req.user.userId);
  }

  @Get('trip/:tripId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Réservations d\'un trajet (DRIVER)',
    description: `Retourne toutes les réservations d'un trajet appartenant au chauffeur authentifié.\n\n` +
      `**Rôle requis : DRIVER**\n\n` +
      `- Un chauffeur ne peut consulter que les réservations de **ses propres trajets** → 403 sinon.\n` +
      `- Chaque réservation inclut les infos du passager (\`passenger\`).`,
  })
  @ApiParam({ name: 'tripId', description: 'UUID du trajet', example: '9b1ee16a-306b-4ca7-9ae5-25aa25eca9e2' })
  @ApiResponse({
    status: 200,
    description: 'Liste des réservations du trajet',
    schema: {
      example: [{
        ...bookingExample,
        passenger: {
          id: 'a975e635-282a-4d4f-981d-d1a33f505ec9',
          name: 'Alice Diallo',
          phone: '+221700000001',
        },
      }],
    },
  })
  @ApiResponse({ status: 401, description: 'Token manquant ou invalide' })
  @ApiResponse({ status: 403, description: 'Ce trajet ne vous appartient pas' })
  @ApiResponse({ status: 404, description: 'Trajet introuvable' })
  async getTripBookings(
    @Param('tripId', new ParseUUIDPipe()) tripId: string,
    @Request() req: RequestWithUser,
  ) {
    return this.bookingService.getTripBookings(tripId, req.user.userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DRIVER')
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Mettre à jour le statut d\'une réservation (DRIVER)',
    description: `Permet au chauffeur de confirmer, rejeter ou annuler une réservation.\n\n` +
      `**Rôle requis : DRIVER**\n\n` +
      `| Statut | Description |\n` +
      `|--------|-------------|\n` +
      `| \`CONFIRMED\` | Le chauffeur accepte le passager |\n` +
      `| \`REJECTED\` | Le chauffeur refuse la réservation |\n` +
      `| \`CANCELLED\` | Annulation de la réservation |\n\n` +
      `Un chauffeur ne peut modifier que les réservations de **ses propres trajets** → 403 sinon.`,
  })
  @ApiParam({ name: 'id', description: 'UUID de la réservation', example: '16a0e9eb-1823-4d81-a8d1-3dabba946d15' })
  @ApiBody({ type: UpdateBookingStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Statut mis à jour',
    schema: { example: { ...bookingExample, status: 'CONFIRMED' } },
  })
  @ApiResponse({ status: 401, description: 'Token manquant ou invalide' })
  @ApiResponse({ status: 403, description: 'Cette réservation n\'appartient pas à votre trajet' })
  @ApiResponse({ status: 404, description: 'Réservation introuvable' })
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateBookingStatusDto,
    @Request() req: RequestWithUser,
  ) {
    return this.bookingService.updateStatus(id, req.user.userId, dto);
  }
}
