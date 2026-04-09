import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DatabaseModule } from '../../src/infrastructure/db/database.module';
import { AppCacheModule } from '../../src/infrastructure/cache/cache.module';
import { CreateBookingUseCase } from '../../src/application/use-cases/create-booking.use-case';
import { UpdateBookingStatusUseCase } from '../../src/application/use-cases/update-booking-status.use-case';
import { GetMyBookingsUseCase } from '../../src/application/use-cases/get-my-bookings.use-case';
import { GetTripBookingsUseCase } from '../../src/application/use-cases/get-trip-bookings.use-case';
import { BookingRepository } from '../../src/infrastructure/db/repositories/booking.repository';
import { TripRepository } from '../../src/infrastructure/db/repositories/trip.repository';
import { UserRepository } from '../../src/infrastructure/db/repositories/user.repository';
import { User } from '../../src/domains/identity/entities/user.entity';
import { Trip } from '../../src/domains/trip/entities/trip.entity';
import { Booking } from '../../src/domains/booking/entities/booking.entity';
import { DriverAvailability } from '../../src/domains/identity/entities/driver-availability.entity';
import { AuditLog } from '../../src/infrastructure/db/entities/audit-log.entity';
import * as bcrypt from 'bcrypt';

jest.setTimeout(30000);

describe('Booking — Tests d\'intégration', () => {
  let module: TestingModule;
  let dataSource: DataSource;
  let userRepository: UserRepository;
  let tripRepository: TripRepository;
  let bookingRepository: BookingRepository;
  let createBookingUseCase: CreateBookingUseCase;
  let updateBookingStatusUseCase: UpdateBookingStatusUseCase;
  let getMyBookingsUseCase: GetMyBookingsUseCase;
  let getTripBookingsUseCase: GetTripBookingsUseCase;

  let driver: User;
  let passenger: User;
  let trip: Trip;

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
      providers: [
        CreateBookingUseCase,
        UpdateBookingStatusUseCase,
        GetMyBookingsUseCase,
        GetTripBookingsUseCase,
      ],
    }).compile();

    dataSource = module.get(DataSource);
    userRepository = module.get(UserRepository);
    tripRepository = module.get(TripRepository);
    bookingRepository = module.get(BookingRepository);
    createBookingUseCase = module.get(CreateBookingUseCase);
    updateBookingStatusUseCase = module.get(UpdateBookingStatusUseCase);
    getMyBookingsUseCase = module.get(GetMyBookingsUseCase);
    getTripBookingsUseCase = module.get(GetTripBookingsUseCase);

    const hashedPassword = await bcrypt.hash('pass1234', 10);

    driver = await userRepository.save({
      phone: '+221788000010',
      name: 'Driver Integration',
      role: 'DRIVER',
      password: hashedPassword,
    });

    passenger = await userRepository.save({
      phone: '+221788000011',
      name: 'Passenger Integration',
      role: 'PASSENGER',
      password: hashedPassword,
    });

    trip = await tripRepository.save({
      driverId: driver.id,
      departureCity: 'dakar',
      destinationCity: 'saint-louis',
      departureTime: new Date('2026-05-01T07:00:00Z'),
      capacity: 4,
      availableSeats: 4,
      price: 3000,
      status: 'ACTIVE',
    });
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM audit_logs');
    await dataSource.query(`DELETE FROM bookings WHERE trip_id = '${trip.id}'`);
    await dataSource.query(`DELETE FROM trips WHERE id = '${trip.id}'`);
    await dataSource.query(`DELETE FROM users WHERE id IN ('${driver.id}', '${passenger.id}')`);
    await module.close();
  });

  // ─── BookingRepository ───────────────────────────────────────────────────────

  describe('BookingRepository', () => {
    let booking: Booking;

    it('save() crée une réservation en base', async () => {
      booking = await bookingRepository.save({
        tripId: trip.id,
        passengerId: passenger.id,
        seats: 1,
        status: 'PENDING',
        idempotencyKey: 'integration-key-001',
      });

      expect(booking.id).toBeDefined();
      expect(booking.status).toBe('PENDING');
    });

    it('findById() retourne la réservation avec les relations', async () => {
      const found = await bookingRepository.findById(booking.id);
      expect(found).not.toBeNull();
      expect(found!.trip).toBeDefined();
      expect(found!.passenger).toBeDefined();
      expect(found!.trip.driverId).toBe(driver.id);
    });

    it('findByPassengerId() retourne les réservations du passager', async () => {
      const bookings = await bookingRepository.findByPassengerId(passenger.id);
      expect(bookings.length).toBeGreaterThan(0);
      expect(bookings[0].trip).toBeDefined();
    });

    it('findByTripId() retourne les réservations du trajet', async () => {
      const bookings = await bookingRepository.findByTripId(trip.id);
      expect(bookings.length).toBeGreaterThan(0);
      expect(bookings[0].passenger).toBeDefined();
    });

    afterAll(async () => {
      if (booking?.id) {
        await dataSource.query(`DELETE FROM bookings WHERE id = '${booking.id}'`);
      }
    });
  });

  // ─── CreateBookingUseCase ────────────────────────────────────────────────────

  describe('CreateBookingUseCase', () => {
    let booking: Booking;

    it('crée une réservation et décrémente availableSeats', async () => {
      booking = await createBookingUseCase.execute({
        tripId: trip.id,
        passengerId: passenger.id,
        seats: 2,
        idempotencyKey: 'integration-create-001',
      });

      expect(booking.id).toBeDefined();
      expect(booking.status).toBe('PENDING');
      expect(booking.seats).toBe(2);

      const updatedTrip = await tripRepository.findById(trip.id);
      expect(updatedTrip!.availableSeats).toBe(2); // 4 - 2
    });

    it('retourne la même réservation si idempotencyKey déjà utilisée', async () => {
      const duplicate = await createBookingUseCase.execute({
        tripId: trip.id,
        passengerId: passenger.id,
        seats: 2,
        idempotencyKey: 'integration-create-001',
      });

      expect(duplicate.id).toBe(booking.id);
    });

    it('lève ConflictException si pas assez de places (2 restantes, demande 3)', async () => {
      await expect(createBookingUseCase.execute({
        tripId: trip.id,
        passengerId: passenger.id,
        seats: 3,
        idempotencyKey: 'integration-create-002',
      })).rejects.toThrow('Not enough seats');
    });

    afterAll(async () => {
      if (booking?.id) {
        await dataSource.query(`DELETE FROM audit_logs WHERE entity_id = '${booking.id}'`);
        await dataSource.query(`DELETE FROM bookings WHERE id = '${booking.id}'`);
        await dataSource.query(`UPDATE trips SET available_seats = 4, status = 'ACTIVE' WHERE id = '${trip.id}'`);
      }
    });
  });

  // ─── UpdateBookingStatusUseCase ──────────────────────────────────────────────

  describe('UpdateBookingStatusUseCase', () => {
    let booking: Booking;

    beforeAll(async () => {
      booking = await createBookingUseCase.execute({
        tripId: trip.id,
        passengerId: passenger.id,
        seats: 1,
        idempotencyKey: 'integration-status-001',
      });
    });

    it('confirme une réservation', async () => {
      const updated = await updateBookingStatusUseCase.execute(booking.id, driver.id, { status: 'CONFIRMED' });
      expect(updated.status).toBe('CONFIRMED');
    });

    it('lève ForbiddenException si le chauffeur ne possède pas le trajet', async () => {
      await expect(
        updateBookingStatusUseCase.execute(booking.id, passenger.id, { status: 'REJECTED' })
      ).rejects.toThrow('propres trajets');
    });

    afterAll(async () => {
      if (booking?.id) {
        await dataSource.query(`DELETE FROM audit_logs WHERE entity_id = '${booking.id}'`);
        await dataSource.query(`DELETE FROM bookings WHERE id = '${booking.id}'`);
        await dataSource.query(`UPDATE trips SET available_seats = 4 WHERE id = '${trip.id}'`);
      }
    });
  });

  // ─── GetMyBookingsUseCase ────────────────────────────────────────────────────

  describe('GetMyBookingsUseCase', () => {
    let booking: Booking;

    beforeAll(async () => {
      booking = await createBookingUseCase.execute({
        tripId: trip.id,
        passengerId: passenger.id,
        seats: 1,
        idempotencyKey: 'integration-getmy-001',
      });
    });

    it('retourne les réservations du passager avec trip et driver imbriqués', async () => {
      const bookings = await getMyBookingsUseCase.execute(passenger.id);
      expect(bookings.length).toBeGreaterThan(0);
      const found = bookings.find(b => b.id === booking.id);
      expect(found).toBeDefined();
      expect(found!.trip.driver).toBeDefined();
      expect(found!.trip.driver.id).toBe(driver.id);
    });

    it('retourne un tableau vide pour un passager sans réservation', async () => {
      const bookings = await getMyBookingsUseCase.execute('00000000-0000-0000-0000-000000000000');
      expect(bookings).toEqual([]);
    });

    afterAll(async () => {
      if (booking?.id) {
        await dataSource.query(`DELETE FROM audit_logs WHERE entity_id = '${booking.id}'`);
        await dataSource.query(`DELETE FROM bookings WHERE id = '${booking.id}'`);
        await dataSource.query(`UPDATE trips SET available_seats = 4 WHERE id = '${trip.id}'`);
      }
    });
  });

  // ─── GetTripBookingsUseCase ──────────────────────────────────────────────────

  describe('GetTripBookingsUseCase', () => {
    let booking: Booking;

    beforeAll(async () => {
      booking = await createBookingUseCase.execute({
        tripId: trip.id,
        passengerId: passenger.id,
        seats: 1,
        idempotencyKey: 'integration-gettrip-001',
      });
    });

    it('retourne les réservations du trajet avec les passagers', async () => {
      const bookings = await getTripBookingsUseCase.execute(trip.id, driver.id);
      expect(bookings.length).toBeGreaterThan(0);
      expect(bookings[0].passenger).toBeDefined();
    });

    it('lève ForbiddenException si le chauffeur ne possède pas le trajet', async () => {
      await expect(getTripBookingsUseCase.execute(trip.id, passenger.id))
        .rejects.toThrow('propres trajets');
    });

    it('lève NotFoundException si le trajet n\'existe pas', async () => {
      await expect(getTripBookingsUseCase.execute('00000000-0000-0000-0000-000000000000', driver.id))
        .rejects.toThrow('introuvable');
    });

    afterAll(async () => {
      if (booking?.id) {
        await dataSource.query(`DELETE FROM audit_logs WHERE entity_id = '${booking.id}'`);
        await dataSource.query(`DELETE FROM bookings WHERE id = '${booking.id}'`);
        await dataSource.query(`UPDATE trips SET available_seats = 4 WHERE id = '${trip.id}'`);
      }
    });
  });
});
