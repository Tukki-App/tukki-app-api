import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DatabaseModule } from '../../src/infrastructure/db/database.module';
import { AppCacheModule } from '../../src/infrastructure/cache/cache.module';
import { CreateTripUseCase } from '../../src/application/use-cases/create-trip.use-case';
import { SearchTripsUseCase } from '../../src/application/use-cases/search-trips.use-case';
import { TripRepository } from '../../src/infrastructure/db/repositories/trip.repository';
import { UserRepository } from '../../src/infrastructure/db/repositories/user.repository';
import { User } from '../../src/domains/identity/entities/user.entity';
import { Trip } from '../../src/domains/trip/entities/trip.entity';
import * as bcrypt from 'bcrypt';

jest.setTimeout(30000);

describe('Trip — Tests d\'intégration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let userRepository: UserRepository;
  let tripRepository: TripRepository;
  let createTripUseCase: CreateTripUseCase;
  let searchTripsUseCase: SearchTripsUseCase;

  let driver: User;
  const createdTripIds: string[] = [];

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
        DatabaseModule,
        AppCacheModule,
      ],
      providers: [CreateTripUseCase, SearchTripsUseCase],
    }).compile();

    dataSource = module.get(DataSource);
    userRepository = module.get(UserRepository);
    tripRepository = module.get(TripRepository);
    createTripUseCase = module.get(CreateTripUseCase);
    searchTripsUseCase = module.get(SearchTripsUseCase);

    const hashedPassword = await bcrypt.hash('pass1234', 10);
    driver = await userRepository.save({
      phone: '+221788000020',
      name: 'Driver Trip Integration',
      role: 'DRIVER',
      password: hashedPassword,
    });
  });

  afterAll(async () => {
    if (createdTripIds.length) {
      await dataSource.query(`DELETE FROM trips WHERE id IN ('${createdTripIds.join("','")}')`);
    }
    await dataSource.query(`DELETE FROM users WHERE id = '${driver.id}'`);
    await module.close();
  });

  // ─── TripRepository ──────────────────────────────────────────────────────────

  describe('TripRepository', () => {
    let trip: Trip;

    it('save() crée un trajet en base', async () => {
      trip = await tripRepository.save({
        driverId: driver.id,
        departureCity: 'dakar',
        destinationCity: 'mbour',
        departureTime: new Date('2026-05-10T06:00:00Z'),
        capacity: 3,
        availableSeats: 3,
        price: 1500,
        status: 'ACTIVE',
      });

      expect(trip.id).toBeDefined();
      expect(trip.status).toBe('ACTIVE');
      createdTripIds.push(trip.id);
    });

    it('findById() retourne le trajet', async () => {
      const found = await tripRepository.findById(trip.id);
      expect(found).not.toBeNull();
      expect(found!.departureCity).toBe('dakar');
    });

    it('findById() retourne null pour un id inexistant', async () => {
      const found = await tripRepository.findById('00000000-0000-0000-0000-000000000000');
      expect(found).toBeNull();
    });

    it('findByDriverId() retourne les trajets du chauffeur', async () => {
      const trips = await tripRepository.findByDriverId(driver.id);
      expect(trips.length).toBeGreaterThan(0);
      expect(trips[0].driverId).toBe(driver.id);
    });

    it('searchTrips() retourne les trajets actifs pour la date et l\'itinéraire', async () => {
      const result = await tripRepository.searchTrips({
        departureCity: 'dakar',
        destinationCity: 'mbour',
        departureTime: '2026-05-10',
        limit: 10,
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].status).toBe('ACTIVE');
      expect(result.nextCursor).toBeUndefined();
    });

    it('searchTrips() retourne un tableau vide si aucun trajet ne correspond', async () => {
      const result = await tripRepository.searchTrips({
        departureCity: 'ziguinchor',
        destinationCity: 'kaolack',
        departureTime: '2026-05-10',
        limit: 10,
      });

      expect(result.data).toEqual([]);
    });
  });

  // ─── CreateTripUseCase ───────────────────────────────────────────────────────

  describe('CreateTripUseCase', () => {
    it('crée un trajet avec les villes normalisées en minuscules', async () => {
      const trip = await createTripUseCase.execute({
        driverId: driver.id,
        departureCity: 'Thiès',
        destinationCity: 'Kaolack',
        departureTime: '2026-05-15T09:00:00Z',
        capacity: 5,
        price: 2000,
      });

      expect(trip.id).toBeDefined();
      expect(trip.departureCity).toBe('thiès');
      expect(trip.destinationCity).toBe('kaolack');
      expect(trip.availableSeats).toBe(5);
      expect(trip.status).toBe('ACTIVE');
      createdTripIds.push(trip.id);
    });
  });

  // ─── SearchTripsUseCase (avec cache) ─────────────────────────────────────────

  describe('SearchTripsUseCase', () => {
    beforeAll(async () => {
      const trip = await tripRepository.save({
        driverId: driver.id,
        departureCity: 'dakar',
        destinationCity: 'touba',
        departureTime: new Date('2026-05-20T08:00:00Z'),
        capacity: 4,
        availableSeats: 4,
        price: 2500,
        status: 'ACTIVE',
      });
      createdTripIds.push(trip.id);
    });

    it('retourne les trajets correspondants', async () => {
      const result = await searchTripsUseCase.execute({
        departureCity: 'Dakar',
        destinationCity: 'Touba',
        departureTime: '2026-05-20',
        limit: 10,
      });

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].departureCity).toBe('dakar');
    });

    it('retourne le même résultat depuis le cache au 2e appel', async () => {
      const first = await searchTripsUseCase.execute({
        departureCity: 'Dakar',
        destinationCity: 'Touba',
        departureTime: '2026-05-20',
        limit: 10,
      });

      const second = await searchTripsUseCase.execute({
        departureCity: 'Dakar',
        destinationCity: 'Touba',
        departureTime: '2026-05-20',
        limit: 10,
      });

      expect(second.data.length).toBe(first.data.length);
      expect(second.data[0].id).toBe(first.data[0].id);
    });

    it('pagination par curseur — retourne nextCursor si plus de résultats', async () => {
      for (let i = 0; i < 2; i++) {
        const t = await tripRepository.save({
          driverId: driver.id,
          departureCity: 'dakar',
          destinationCity: 'touba',
          departureTime: new Date('2026-05-20T08:00:00Z'),
          capacity: 4,
          availableSeats: 4,
          price: 2500,
          status: 'ACTIVE',
        });
        createdTripIds.push(t.id);
      }

      const result = await searchTripsUseCase.execute({
        departureCity: 'Dakar',
        destinationCity: 'Touba',
        departureTime: '2026-05-20',
        limit: 2,
      });

      if (result.data.length === 2) {
        expect(result.nextCursor).toBeDefined();
      }
    });
  });
});
