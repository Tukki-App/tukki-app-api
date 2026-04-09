import { Injectable } from '@nestjs/common';
import { TripRepository } from '../../infrastructure/db/repositories/trip.repository';
import { CreateTripDto } from './dtos/create-trip.dto';
import { Trip } from '../../domains/trip/entities/trip.entity';

@Injectable()
export class CreateTripUseCase {
  constructor(private readonly tripRepository: TripRepository) {}

  async execute(dto: CreateTripDto): Promise<Trip> {
    const { driverId, departureCity, destinationCity, departureTime, capacity, price } = dto;

    return this.tripRepository.save({
      driverId,
      departureCity: departureCity.trim().toLowerCase(),
      destinationCity: destinationCity.trim().toLowerCase(),
      departureTime: new Date(departureTime),
      capacity,
      availableSeats: capacity,
      price,
      status: 'ACTIVE',
    });
  }
}
