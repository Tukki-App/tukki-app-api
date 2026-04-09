import 'dotenv/config';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

jest.setTimeout(30000);

describe('API e2e', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  let driverToken: string;
  let passengerToken: string;
  let driverId: string;
  let passengerId: string;
  let tripId: string;
  let bookingId: string;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = module.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.query('DELETE FROM bookings');
    await dataSource.query('DELETE FROM trips');
    await dataSource.query('DELETE FROM driver_availability');
    await dataSource.query(`DELETE FROM users WHERE phone IN ('+221799000001', '+221799000002')`);
    await app.close();
  });

  // ─── Auth ────────────────────────────────────────────────────────────────────

  describe('POST /identity/register', () => {
    it('crée un chauffeur', async () => {
      const res = await request(app.getHttpServer())
        .post('/identity/register')
        .send({ phone: '+221799000002', name: 'Bob Test', role: 'DRIVER', password: 'pass1234' })
        .expect(201);

      expect(res.body.password).toBeUndefined();
      expect(res.body.role).toBe('DRIVER');
      driverId = res.body.id;
    });

    it('crée un passager', async () => {
      const res = await request(app.getHttpServer())
        .post('/identity/register')
        .send({ phone: '+221799000001', name: 'Alice Test', role: 'PASSENGER', password: 'pass1234' })
        .expect(201);

      expect(res.body.password).toBeUndefined();
      passengerId = res.body.id;
    });

    it('retourne 409 si le numéro est déjà utilisé', () => {
      return request(app.getHttpServer())
        .post('/identity/register')
        .send({ phone: '+221799000001', name: 'Doublon', role: 'PASSENGER', password: 'pass1234' })
        .expect(409);
    });

    it('retourne 400 si le format téléphone est invalide', () => {
      return request(app.getHttpServer())
        .post('/identity/register')
        .send({ phone: '0600000001', name: 'Test', role: 'PASSENGER', password: 'pass1234' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('connecte le chauffeur et retourne un JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: '+221799000002', password: 'pass1234' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      driverToken = res.body.accessToken;
    });

    it('connecte le passager et retourne un JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: '+221799000001', password: 'pass1234' })
        .expect(200);

      passengerToken = res.body.accessToken;
    });

    it('retourne 401 si le mot de passe est incorrect', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ phone: '+221799000001', password: 'wrongpass' })
        .expect(401);
    });
  });

  // ─── Trips ───────────────────────────────────────────────────────────────────

  describe('POST /trips', () => {
    it('crée un trajet (DRIVER)', async () => {
      const res = await request(app.getHttpServer())
        .post('/trips')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({
          driverId,
          departureCity: 'Dakar',
          destinationCity: 'Thiès',
          departureTime: '2026-04-20T08:00:00Z',
          capacity: 4,
          price: 2500,
        })
        .expect(201);

      expect(res.body.status).toBe('ACTIVE');
      expect(res.body.departureCity).toBe('dakar');
      expect(res.body.availableSeats).toBe(4);
      tripId = res.body.id;
    });

    it('retourne 403 si un PASSENGER essaie de créer un trajet', () => {
      return request(app.getHttpServer())
        .post('/trips')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ driverId, departureCity: 'Dakar', destinationCity: 'Thiès', departureTime: '2026-04-20T08:00:00Z', capacity: 4, price: 0 })
        .expect(403);
    });

    it('retourne 401 sans token', () => {
      return request(app.getHttpServer()).post('/trips').send({}).expect(401);
    });
  });

  describe('GET /trips/search', () => {
    it('retourne les trajets actifs pour la date donnée', async () => {
      const res = await request(app.getHttpServer())
        .get('/trips/search')
        .query({ departureCity: 'Dakar', destinationCity: 'Thiès', departureTime: '2026-04-20' })
        .expect(200);

      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0].status).toBe('ACTIVE');
    });

    it('retourne un tableau vide si aucun trajet ne correspond', async () => {
      const res = await request(app.getHttpServer())
        .get('/trips/search')
        .query({ departureCity: 'Ziguinchor', destinationCity: 'Kaolack', departureTime: '2026-04-20' })
        .expect(200);

      expect(res.body.data).toEqual([]);
    });
  });

  // ─── Bookings ────────────────────────────────────────────────────────────────

  describe('POST /bookings', () => {
    it('crée une réservation (PASSENGER)', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ tripId, passengerId, seats: 2, idempotencyKey: 'e2e-key-001' })
        .expect(201);

      expect(res.body.status).toBe('PENDING');
      expect(res.body.seats).toBe(2);
      bookingId = res.body.id;
    });

    it('retourne la même réservation si idempotencyKey déjà utilisée (pas de doublon)', async () => {
      const res = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ tripId, passengerId, seats: 2, idempotencyKey: 'e2e-key-001' })
        .expect(201);

      expect(res.body.id).toBe(bookingId);
    });

    it('retourne 403 si un DRIVER essaie de réserver', () => {
      return request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ tripId, passengerId, seats: 1 })
        .expect(403);
    });
  });

  describe('GET /bookings/my-bookings', () => {
    it('retourne les réservations du passager avec le trajet imbriqué', async () => {
      const res = await request(app.getHttpServer())
        .get('/bookings/my-bookings')
        .set('Authorization', `Bearer ${passengerToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body[0].trip).toBeDefined();
      expect(res.body[0].trip.driver).toBeDefined();
    });

    it('retourne 403 si un DRIVER appelle cet endpoint', () => {
      return request(app.getHttpServer())
        .get('/bookings/my-bookings')
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(403);
    });
  });

  describe('GET /bookings/trip/:tripId', () => {
    it('retourne les réservations du trajet (DRIVER propriétaire)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/bookings/trip/${tripId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body[0].passenger).toBeDefined();
    });
  });

  describe('PATCH /bookings/:id/status', () => {
    it('confirme la réservation (DRIVER)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'CONFIRMED' })
        .expect(200);

      expect(res.body.status).toBe('CONFIRMED');
    });

    it('retourne 403 si un PASSENGER essaie de changer le statut', () => {
      return request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ status: 'CANCELLED' })
        .expect(403);
    });

    it('retourne 400 si le statut est invalide', () => {
      return request(app.getHttpServer())
        .patch(`/bookings/${bookingId}/status`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });
  });

  // ─── Identity ────────────────────────────────────────────────────────────────

  describe('PATCH /identity/availability/:driverId', () => {
    it('met à jour la disponibilité du chauffeur', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/identity/availability/${driverId}`)
        .set('Authorization', `Bearer ${driverToken}`)
        .send({ isOnline: true })
        .expect(200);

      expect(res.body.isOnline).toBe(true);
    });

    it('retourne 403 si un PASSENGER essaie de mettre à jour la disponibilité', () => {
      return request(app.getHttpServer())
        .patch(`/identity/availability/${driverId}`)
        .set('Authorization', `Bearer ${passengerToken}`)
        .send({ isOnline: true })
        .expect(403);
    });
  });
});
