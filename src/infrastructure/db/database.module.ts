import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../../domains/identity/entities/user.entity';
import { Trip } from '../../domains/trip/entities/trip.entity';
import { Booking } from '../../domains/booking/entities/booking.entity';
import { DriverAvailability } from '../../domains/identity/entities/driver-availability.entity';
import { AuditLog } from './entities/audit-log.entity';
import { UserRepository } from './repositories/user.repository';
import { TripRepository } from './repositories/trip.repository';
import { BookingRepository } from './repositories/booking.repository';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Trip, Booking, DriverAvailability, AuditLog]),
  ],
  providers: [UserRepository, TripRepository, BookingRepository],
  exports: [UserRepository, TripRepository, BookingRepository, TypeOrmModule],
})
export class DatabaseModule {}
