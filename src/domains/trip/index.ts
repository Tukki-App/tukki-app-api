import { Module } from '@nestjs/common';
import { TripService } from './services/trip.service';
import { CreateTripUseCase } from '../../application/use-cases/create-trip.use-case';
import { SearchTripsUseCase } from '../../application/use-cases/search-trips.use-case';

@Module({
  providers: [TripService, CreateTripUseCase, SearchTripsUseCase],
  exports: [TripService, CreateTripUseCase, SearchTripsUseCase],
})
export class TripModule {}
