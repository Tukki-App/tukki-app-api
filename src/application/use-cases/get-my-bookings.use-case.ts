import { Injectable } from '@nestjs/common';
import { BookingRepository } from '../../infrastructure/db/repositories/booking.repository';
import { Booking } from '../../domains/booking/entities/booking.entity';

@Injectable()
export class GetMyBookingsUseCase {
  constructor(private readonly bookingRepository: BookingRepository) {}

  async execute(passengerId: string): Promise<Booking[]> {
    return this.bookingRepository.findByPassengerId(passengerId);
  }
}
