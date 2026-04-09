import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DatabaseModule } from '../../src/infrastructure/db/database.module';
import { AppCacheModule } from '../../src/infrastructure/cache/cache.module';
import { RegisterUserUseCase } from '../../src/application/use-cases/register-user.use-case';
import { LoginUseCase } from '../../src/application/use-cases/login.use-case';
import { UpdateDriverAvailabilityUseCase } from '../../src/application/use-cases/update-driver-availability.use-case';
import { UserRepository } from '../../src/infrastructure/db/repositories/user.repository';
import { DriverAvailability } from '../../src/domains/identity/entities/driver-availability.entity';
import { TypeOrmModule as TypeOrmFeatureModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

jest.setTimeout(30000);

describe('Identity — Tests d\'intégration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let userRepository: UserRepository;
  let registerUserUseCase: RegisterUserUseCase;
  let loginUseCase: LoginUseCase;
  let updateDriverAvailabilityUseCase: UpdateDriverAvailabilityUseCase;

  const createdUserIds: string[] = [];

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: process.env.DATABASE_URL,
          autoLoadEntities: true,
          synchronize: false,
          logging: false,
        }),
        TypeOrmFeatureModule.forFeature([DriverAvailability]),
        DatabaseModule,
        AppCacheModule,
        JwtModule.register({
          secret: process.env.JWT_SECRET || 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      providers: [RegisterUserUseCase, LoginUseCase, UpdateDriverAvailabilityUseCase],
    }).compile();

    dataSource = module.get(DataSource);
    userRepository = module.get(UserRepository);
    registerUserUseCase = module.get(RegisterUserUseCase);
    loginUseCase = module.get(LoginUseCase);
    updateDriverAvailabilityUseCase = module.get(UpdateDriverAvailabilityUseCase);
  });

  afterAll(async () => {
    if (createdUserIds.length) {
      await dataSource.query(`DELETE FROM driver_availability WHERE driver_id IN ('${createdUserIds.join("','")}')`);
      await dataSource.query(`DELETE FROM users WHERE id IN ('${createdUserIds.join("','")}')`);
    }
    await module.close();
  });

  // ─── UserRepository ──────────────────────────────────────────────────────────

  describe('UserRepository', () => {
    it('findByPhone() retourne null si l\'utilisateur n\'existe pas', async () => {
      const user = await userRepository.findByPhone('+221700000000');
      expect(user).toBeNull();
    });

    it('findByPhoneWithPassword() retourne le password hashé', async () => {
      const user = await registerUserUseCase.execute({
        phone: '+221788000030',
        name: 'Test User',
        role: 'PASSENGER',
        password: 'pass1234',
      });
      createdUserIds.push(user.id);

      const withPassword = await userRepository.findByPhoneWithPassword('+221788000030');
      expect(withPassword).not.toBeNull();
      expect(withPassword!.password).toBeDefined();
      expect(withPassword!.password).toMatch(/^\$2b\$/); // bcrypt hash
    });
  });

  // ─── RegisterUserUseCase ─────────────────────────────────────────────────────

  describe('RegisterUserUseCase', () => {
    it('crée un passager sans enregistrement de disponibilité', async () => {
      const user = await registerUserUseCase.execute({
        phone: '+221788000031',
        name: 'Alice Integration',
        role: 'PASSENGER',
        password: 'pass1234',
      });

      expect(user.id).toBeDefined();
      expect(user.role).toBe('PASSENGER');
      expect(user.password).toBeUndefined(); // exclu de la réponse
      createdUserIds.push(user.id);

      const availability = await dataSource.query(
        `SELECT * FROM driver_availability WHERE driver_id = '${user.id}'`
      );
      expect(availability.length).toBe(0);
    });

    it('crée un chauffeur avec un enregistrement de disponibilité (isOnline: false)', async () => {
      const user = await registerUserUseCase.execute({
        phone: '+221788000032',
        name: 'Bob Integration',
        role: 'DRIVER',
        password: 'pass1234',
      });

      expect(user.role).toBe('DRIVER');
      createdUserIds.push(user.id);

      const [availability] = await dataSource.query(
        `SELECT * FROM driver_availability WHERE driver_id = '${user.id}'`
      );
      expect(availability).toBeDefined();
      expect(availability.is_online).toBe(false);
    });

    it('lève ConflictException si le numéro est déjà utilisé', async () => {
      await expect(registerUserUseCase.execute({
        phone: '+221788000031',
        name: 'Doublon',
        role: 'PASSENGER',
        password: 'pass1234',
      })).rejects.toThrow(ConflictException);
    });
  });

  // ─── LoginUseCase ────────────────────────────────────────────────────────────

  describe('LoginUseCase', () => {
    beforeAll(async () => {
      const user = await registerUserUseCase.execute({
        phone: '+221788000033',
        name: 'Login Test',
        role: 'PASSENGER',
        password: 'pass1234',
      });
      createdUserIds.push(user.id);
    });

    it('retourne un accessToken JWT valide', async () => {
      const result = await loginUseCase.execute({
        phone: '+221788000033',
        password: 'pass1234',
      });

      expect(result.accessToken).toBeDefined();
      // JWT format : header.payload.signature
      expect(result.accessToken.split('.')).toHaveLength(3);
    });

    it('lève UnauthorizedException si le mot de passe est incorrect', async () => {
      await expect(loginUseCase.execute({
        phone: '+221788000033',
        password: 'wrongpass',
      })).rejects.toThrow('incorrect');
    });

    it('lève UnauthorizedException si le numéro n\'existe pas', async () => {
      await expect(loginUseCase.execute({
        phone: '+221700000099',
        password: 'pass1234',
      })).rejects.toThrow('incorrect');
    });
  });

  // ─── UpdateDriverAvailabilityUseCase ─────────────────────────────────────────

  describe('UpdateDriverAvailabilityUseCase', () => {
    let driverId: string;

    beforeAll(async () => {
      const driver = await registerUserUseCase.execute({
        phone: '+221788000034',
        name: 'Availability Driver',
        role: 'DRIVER',
        password: 'pass1234',
      });
      driverId = driver.id;
      createdUserIds.push(driverId);
    });

    it('met le chauffeur en ligne', async () => {
      const result = await updateDriverAvailabilityUseCase.execute(driverId, { isOnline: true });
      expect(result.isOnline).toBe(true);
      expect(result.lastSeen).toBeDefined();
    });

    it('met le chauffeur hors ligne', async () => {
      const result = await updateDriverAvailabilityUseCase.execute(driverId, { isOnline: false });
      expect(result.isOnline).toBe(false);
    });

    it('lève NotFoundException pour un chauffeur inexistant', async () => {
      await expect(
        updateDriverAvailabilityUseCase.execute('00000000-0000-0000-0000-000000000000', { isOnline: true })
      ).rejects.toThrow('not found');
    });
  });
});
