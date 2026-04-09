import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { BookingRepository } from '../../infrastructure/db/repositories/booking.repository';
import { TripRepository } from '../../infrastructure/db/repositories/trip.repository';
import { Booking } from '../../domains/booking/entities/booking.entity';

@Injectable()
export class GetTripBookingsUseCase {
  constructor(
    private readonly bookingRepository: BookingRepository,
    private readonly tripRepository: TripRepository,
  ) {}

  async execute(tripId: string, driverId: string): Promise<Booking[]> {
    const trip = await this.tripRepository.findById(tripId);

    if (!trip) {
      throw new NotFoundException(`Trajet ${tripId} introuvable.`);
    }

    if (trip.driverId !== driverId) {
      throw new ForbiddenException('Vous ne pouvez consulter que les réservations de vos propres trajets.');
    }

    return this.bookingRepository.findByTripId(tripId);
  }
}
