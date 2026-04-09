import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DriverAvailability } from './entities/driver-availability.entity';
import { IdentityService } from './services/identity.service';
import { RegisterUserUseCase } from '../../application/use-cases/register-user.use-case';
import { UpdateDriverAvailabilityUseCase } from '../../application/use-cases/update-driver-availability.use-case';

@Module({
  imports: [TypeOrmModule.forFeature([DriverAvailability])],
  providers: [IdentityService, RegisterUserUseCase, UpdateDriverAvailabilityUseCase],
  exports: [IdentityService, RegisterUserUseCase, UpdateDriverAvailabilityUseCase],
})
export class IdentityModule {}
