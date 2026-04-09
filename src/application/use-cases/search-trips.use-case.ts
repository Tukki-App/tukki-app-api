import { Injectable } from '@nestjs/common';
import { TripRepository } from '../../infrastructure/db/repositories/trip.repository';
import { AppCacheService } from '../../infrastructure/cache/cache.service';
import { SearchTripDto } from './dtos/search-trip.dto';
import { Trip } from '../../domains/trip/entities/trip.entity';
import * as crypto from 'crypto';

@Injectable()
export class SearchTripsUseCase {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly cacheService: AppCacheService,
  ) {}

  async execute(dto: SearchTripDto): Promise<{ data: Trip[]; nextCursor?: string }> {
    const { departureCity, destinationCity, departureTime, limit = 10, cursor } = dto;

    const normalizedDeparture = departureCity.trim().toLowerCase();
    const normalizedDestination = destinationCity.trim().toLowerCase();

    const hashData = JSON.stringify({ normalizedDeparture, normalizedDestination, departureTime, limit, cursor });
    const cacheKey = `search-trips:${crypto.createHash('md5').update(hashData).digest('hex')}`;

    const cached = await this.cacheService.get<{ data: Trip[]; nextCursor?: string }>(cacheKey);
    if (cached) return cached;

    const result = await this.tripRepository.searchTrips({
      departureCity: normalizedDeparture,
      destinationCity: normalizedDestination,
      departureTime,
      limit,
      cursor,
    });

    await this.cacheService.set(cacheKey, result, 60);
    return result;
  }
}
