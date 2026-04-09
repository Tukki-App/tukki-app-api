import { Module } from '@nestjs/common';
import { AuthModule } from '../domains/auth';
import { IdentityModule } from '../domains/identity';
import { TripModule } from '../domains/trip';
import { BookingModule } from '../domains/booking';

import { AuthController } from './http/controllers/auth.controller';
import { IdentityController } from './http/controllers/identity.controller';
import { TripController } from './http/controllers/trip.controller';
import { BookingController } from './http/controllers/booking.controller';
import { DriverAvailabilityGateway } from './websocket/gateways/driver-availability.gateway';

@Module({
  imports: [AuthModule, IdentityModule, TripModule, BookingModule],
  controllers: [AuthController, IdentityController, TripController, BookingController],
  providers: [DriverAvailabilityGateway],
})
export class InterfacesModule {}
