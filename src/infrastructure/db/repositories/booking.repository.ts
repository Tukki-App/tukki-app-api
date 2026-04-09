import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../../../domains/booking/entities/booking.entity';

@Injectable()
export class BookingRepository {
  constructor(
    @InjectRepository(Booking)
    private readonly repo: Repository<Booking>,
  ) {}

  async findById(id: string): Promise<Booking | null> {
    return this.repo.findOne({ where: { id }, relations: ['trip', 'passenger'] });
  }

  async findByPassengerId(passengerId: string): Promise<Booking[]> {
    return this.repo.find({
      where: { passengerId },
      relations: ['trip', 'trip.driver'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByTripId(tripId: string): Promise<Booking[]> {
    return this.repo.find({
      where: { tripId },
      relations: ['passenger'],
      order: { createdAt: 'ASC' },
    });
  }

  async save(booking: Partial<Booking>): Promise<Booking> {
    return this.repo.save(booking as Booking);
  }

  getRepositoryRef(): Repository<Booking> {
    return this.repo;
  }
}
