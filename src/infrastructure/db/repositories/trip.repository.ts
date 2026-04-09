import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../../../domains/trip/entities/trip.entity';

@Injectable()
export class TripRepository {
  constructor(
    @InjectRepository(Trip)
    private readonly repo: Repository<Trip>,
  ) {}

  async findById(id: string): Promise<Trip | null> {
    return this.repo.findOne({ where: { id } });
  }

  async findByDriverId(driverId: string): Promise<Trip[]> {
    return this.repo.find({ where: { driverId }, order: { departureTime: 'DESC' } });
  }

  async searchTrips(params: {
    departureCity: string;
    destinationCity: string;
    departureTime: string | Date;
    limit: number;
    cursor?: string;
  }): Promise<{ data: Trip[]; nextCursor?: string }> {
    const { departureCity, destinationCity, departureTime, limit, cursor } = params;

    const startOfDay = new Date(departureTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(departureTime);
    endOfDay.setHours(23, 59, 59, 999);

    const qb = this.repo.createQueryBuilder('trip')
      .where('trip.departure_city = :departure', { departure: departureCity })
      .andWhere('trip.destination_city = :destination', { destination: destinationCity })
      .andWhere('trip.status = :status', { status: 'ACTIVE' })
      .andWhere('trip.deleted_at IS NULL')
      .andWhere('trip.departure_time BETWEEN :start AND :end', { start: startOfDay, end: endOfDay });

    if (cursor) {
      qb.andWhere('trip.id > :cursor', { cursor });
    }

    qb.orderBy('trip.id', 'ASC').limit(limit + 1);

    const trips = await qb.getMany();

    let nextCursor: string | undefined;
    if (trips.length > limit) {
      trips.pop();
      nextCursor = trips[trips.length - 1].id;
    }

    return { data: trips, nextCursor };
  }

  async save(trip: Partial<Trip>): Promise<Trip> {
    return this.repo.save(trip as Trip);
  }
}
