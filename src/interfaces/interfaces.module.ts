import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../domains/auth';
import { IdentityModule } from '../domains/identity';
import { TripModule } from '../domains/trip';
import { BookingModule } from '../domains/booking';

import { AuthController } from './http/controllers/auth.controller';
import { IdentityController } from './http/controllers/identity.controller';
import { TripController } from './http/controllers/trip.controller';
import { BookingController } from './http/controllers/booking.controller';
import { UploadController } from './http/controllers/upload.controller';
import { AdminController } from './http/controllers/admin.controller';
import { DriverAvailabilityGateway } from './websocket/gateways/driver-availability.gateway';
import { User } from '../domains/identity/entities/user.entity';
import { Trip } from '../domains/trip/entities/trip.entity';
import { Booking } from '../domains/booking/entities/booking.entity';

@Module({
  imports: [
    AuthModule,
    IdentityModule,
    TripModule,
    BookingModule,
    TypeOrmModule.forFeature([User, Trip, Booking]),
  ],
  controllers: [AuthController, IdentityController, TripController, BookingController, UploadController, AdminController],
  providers: [DriverAvailabilityGateway],
})
export class InterfacesModule {}
