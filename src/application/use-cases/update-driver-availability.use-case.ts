import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverAvailability } from '../../domains/identity/entities/driver-availability.entity';
import { UpdateAvailabilityDto } from './dtos/update-availability.dto';

@Injectable()
export class UpdateDriverAvailabilityUseCase {
  constructor(
    @InjectRepository(DriverAvailability)
    private readonly availabilityRepository: Repository<DriverAvailability>,
  ) {}

  async execute(driverId: string, dto: UpdateAvailabilityDto): Promise<DriverAvailability> {
    const availability = await this.availabilityRepository.findOne({ where: { driverId } });

    if (!availability) {
      throw new NotFoundException(`Driver availability record for ${driverId} not found`);
    }

    availability.isOnline = dto.isOnline;
    availability.lastSeen = new Date();

    return this.availabilityRepository.save(availability);
  }
}
