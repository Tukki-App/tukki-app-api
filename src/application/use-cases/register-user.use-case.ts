import { Injectable, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../../domains/identity/entities/user.entity';
import { DriverAvailability } from '../../domains/identity/entities/driver-availability.entity';
import { RegisterUserDto } from './dtos/register-user.dto';

@Injectable()
export class RegisterUserUseCase {
  constructor(private readonly dataSource: DataSource) {}

  async execute(dto: RegisterUserDto): Promise<User> {
    const { phone, name, role, password } = dto;

    const hashedPassword = await bcrypt.hash(password, 10);

    return await this.dataSource.transaction(async (manager) => {
      try {
        const user = manager.create(User, {
          phone,
          name,
          role,
          password: hashedPassword,
        });
        const savedUser = await manager.save(user);
        delete savedUser.password;

        if (role === 'DRIVER') {
          const availability = manager.create(DriverAvailability, {
            driverId: savedUser.id,
            isOnline: false,
          });
          await manager.save(availability);
        }

        return savedUser;
      } catch (error: any) {
        if (error.code === '23505') { 
          throw new ConflictException(`Le numéro de téléphone ${phone} est déjà utilisé.`);
        }
        throw error;
      }
    });
  }
}
