import { Module } from '@nestjs/common';
import { BookingService } from './services/booking.service';
import { CreateBookingUseCase } from '../../application/use-cases/create-booking.use-case';
import { UpdateBookingStatusUseCase } from '../../application/use-cases/update-booking-status.use-case';
import { GetMyBookingsUseCase } from '../../application/use-cases/get-my-bookings.use-case';
import { GetTripBookingsUseCase } from '../../application/use-cases/get-trip-bookings.use-case';

@Module({
  providers: [
    BookingService,
    CreateBookingUseCase,
    UpdateBookingStatusUseCase,
    GetMyBookingsUseCase,
    GetTripBookingsUseCase,
  ],
  exports: [
    BookingService,
    CreateBookingUseCase,
    UpdateBookingStatusUseCase,
    GetMyBookingsUseCase,
    GetTripBookingsUseCase,
  ],
})
export class BookingModule {}
