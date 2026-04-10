import { Controller, Get, Patch, Delete, Param, ParseUUIDPipe, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../../../infrastructure/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/auth/guards/roles.guard';
import { Roles } from '../../../infrastructure/auth/decorators/roles.decorator';
import { User } from '../../../domains/identity/entities/user.entity';
import { Trip } from '../../../domains/trip/entities/trip.entity';
import { Booking } from '../../../domains/booking/entities/booking.entity';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@ApiBearerAuth('JWT')
export class AdminController {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Trip) private readonly tripRepo: Repository<Trip>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
  ) {}

  // ─── Stats globales ───────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques globales', description: 'Vue d\'ensemble de la plateforme. Rôle ADMIN requis.' })
  @ApiResponse({
    status: 200,
    schema: {
      example: {
        users: { total: 120, passengers: 95, drivers: 24, admins: 1 },
        trips: { total: 340, active: 45, full: 12, cancelled: 8, completed: 275 },
        bookings: { total: 890, pending: 23, confirmed: 720, rejected: 67, cancelled: 80 },
      },
    },
  })
  async getStats() {
    const [totalUsers, passengers, drivers, admins] = await Promise.all([
      this.userRepo.count({ where: { deletedAt: undefined } }),
      this.userRepo.count({ where: { role: 'PASSENGER', deletedAt: undefined } }),
      this.userRepo.count({ where: { role: 'DRIVER', deletedAt: undefined } }),
      this.userRepo.count({ where: { role: 'ADMIN', deletedAt: undefined } }),
    ]);

    const [totalTrips, activeTrips, fullTrips, cancelledTrips, completedTrips] = await Promise.all([
      this.tripRepo.count(),
      this.tripRepo.count({ where: { status: 'ACTIVE' } }),
      this.tripRepo.count({ where: { status: 'FULL' } }),
      this.tripRepo.count({ where: { status: 'CANCELLED' } }),
      this.tripRepo.count({ where: { status: 'COMPLETED' } }),
    ]);

    const [totalBookings, pendingBookings, confirmedBookings, rejectedBookings, cancelledBookings] = await Promise.all([
      this.bookingRepo.count(),
      this.bookingRepo.count({ where: { status: 'PENDING' } }),
      this.bookingRepo.count({ where: { status: 'CONFIRMED' } }),
      this.bookingRepo.count({ where: { status: 'REJECTED' } }),
      this.bookingRepo.count({ where: { status: 'CANCELLED' } }),
    ]);

    return {
      users: { total: totalUsers, passengers, drivers, admins },
      trips: { total: totalTrips, active: activeTrips, full: fullTrips, cancelled: cancelledTrips, completed: completedTrips },
      bookings: { total: totalBookings, pending: pendingBookings, confirmed: confirmedBookings, rejected: rejectedBookings, cancelled: cancelledBookings },
    };
  }

  // ─── Gestion utilisateurs ─────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'Liste des utilisateurs', description: 'Retourne tous les utilisateurs paginés. Rôle ADMIN requis.' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'role', required: false, enum: ['PASSENGER', 'DRIVER', 'ADMIN'] })
  @ApiResponse({ status: 200, description: 'Liste paginée des utilisateurs' })
  async getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('role') role?: 'PASSENGER' | 'DRIVER' | 'ADMIN',
  ) {
    const where = role ? { role, deletedAt: undefined } : { deletedAt: undefined };
    const [users, total] = await this.userRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: users, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) };
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Détail d\'un utilisateur' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  async getUser(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.userRepo.findOneOrFail({ where: { id } });
  }

  @Patch('users/:id/verify')
  @ApiOperation({ summary: 'Vérifier un utilisateur', description: 'Marque le compte comme vérifié (isVerified: true). Rôle ADMIN requis.' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur vérifié' })
  async verifyUser(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.userRepo.update(id, { isVerified: true });
    return this.userRepo.findOneOrFail({ where: { id } });
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Supprimer (soft delete) un utilisateur', description: 'Désactive le compte sans supprimer les données. Rôle ADMIN requis.' })
  @ApiParam({ name: 'id', description: 'UUID de l\'utilisateur' })
  @ApiResponse({ status: 200, description: 'Utilisateur désactivé' })
  async deleteUser(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.userRepo.softDelete(id);
    return { message: 'Utilisateur désactivé avec succès' };
  }

  // ─── Gestion trajets ──────────────────────────────────────────────────────────

  @Get('trips')
  @ApiOperation({ summary: 'Liste de tous les trajets', description: 'Rôle ADMIN requis.' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'FULL', 'CANCELLED', 'COMPLETED'] })
  async getTrips(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: 'ACTIVE' | 'FULL' | 'CANCELLED' | 'COMPLETED',
  ) {
    const where = status ? { status } : {};
    const [trips, total] = await this.tripRepo.findAndCount({
      where,
      relations: ['driver'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: trips, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) };
  }

  @Patch('trips/:id/cancel')
  @ApiOperation({ summary: 'Annuler un trajet', description: 'Force l\'annulation d\'un trajet. Rôle ADMIN requis.' })
  @ApiParam({ name: 'id', description: 'UUID du trajet' })
  async cancelTrip(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.tripRepo.update(id, { status: 'CANCELLED' });
    return { message: 'Trajet annulé' };
  }

  // ─── Gestion réservations ─────────────────────────────────────────────────────

  @Get('bookings')
  @ApiOperation({ summary: 'Liste de toutes les réservations', description: 'Rôle ADMIN requis.' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED'] })
  async getBookings(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED',
  ) {
    const where = status ? { status } : {};
    const [bookings, total] = await this.bookingRepo.findAndCount({
      where,
      relations: ['trip', 'passenger'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data: bookings, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) };
  }
}
