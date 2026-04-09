import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { BookingRepository } from '../../infrastructure/db/repositories/booking.repository';
import { Booking } from '../../domains/booking/entities/booking.entity';
import { UpdateBookingStatusDto } from './dtos/update-booking-status.dto';

@Injectable()
export class UpdateBookingStatusUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async execute(bookingId: string, driverId: string, dto: UpdateBookingStatusDto): Promise<Booking> {
    const booking = await this.bookingRepository.findById(bookingId);

    if (!booking) {
      throw new NotFoundException(`Réservation ${bookingId} introuvable.`);
    }

    if (booking.trip.driverId !== driverId) {
      throw new ForbiddenException('Vous ne pouvez gérer que les réservations de vos propres trajets.');
    }

    booking.status = dto.status;
    return this.bookingRepository.save(booking);
  }
}
