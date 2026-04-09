import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { CreateBookingUseCase } from '../create-booking.use-case';

const makeTrip = (overrides = {}) => ({
  id: 'trip-uuid-1',
  driverId: 'driver-uuid-1',
  status: 'ACTIVE',
  availableSeats: 4,
  ...overrides,
});

const makeBooking = (overrides = {}) => ({
  id: 'booking-uuid-1',
  tripId: 'trip-uuid-1',
  passengerId: 'passenger-uuid-1',
  seats: 2,
  status: 'PENDING',
  idempotencyKey: 'key-001',
  ...overrides,
});

// Crée un use case avec un manager mocké frais à chaque appel
function buildUseCase(managerSetup: (m: any) => void) {
  const m = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  managerSetup(m);
  const dataSource = { transaction: (cb: any) => cb(m) };
  return new (CreateBookingUseCase as any)(dataSource);
}

describe('CreateBookingUseCase', () => {
  it('crée une réservation et décrémente les places disponibles', async () => {
    const trip = makeTrip();
    const booking = makeBooking();

    const useCase = buildUseCase((m) => {
      m.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(trip);
      m.create.mockReturnValueOnce(booking).mockReturnValueOnce({});
      m.save.mockResolvedValueOnce(booking).mockResolvedValue({});
    });

    const result = await useCase.execute({ tripId: 'trip-uuid-1', passengerId: 'p-1', seats: 2, idempotencyKey: 'k1' });

    expect(result).toEqual(booking);
    expect(trip.availableSeats).toBe(2);
  });

  it('retourne la réservation existante si idempotencyKey déjà utilisée', async () => {
    const existing = makeBooking();
    const m = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    m.findOne.mockResolvedValueOnce(existing);
    const useCase = new (CreateBookingUseCase as any)({ transaction: (cb: any) => cb(m) });

    const result = await useCase.execute({ tripId: 'trip-uuid-1', passengerId: 'p-1', seats: 2, idempotencyKey: 'k1' });

    expect(result).toEqual(existing);
    expect(m.save).not.toHaveBeenCalled();
  });

  it('lève NotFoundException si le trajet n\'existe pas', async () => {
    const useCase = buildUseCase((m) => {
      m.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    });

    await expect(useCase.execute({ tripId: 'trip-uuid-999', passengerId: 'p-1', seats: 2 }))
      .rejects.toThrow(NotFoundException);
  });

  it('lève BadRequestException si le trajet n\'est pas ACTIVE', async () => {
    const useCase = buildUseCase((m) => {
      m.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(makeTrip({ status: 'FULL' }));
    });

    await expect(useCase.execute({ tripId: 'trip-uuid-1', passengerId: 'p-1', seats: 2, idempotencyKey: 'k2' }))
      .rejects.toThrow(BadRequestException);
  });

  it('lève ConflictException si pas assez de places', async () => {
    const useCase = buildUseCase((m) => {
      m.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(makeTrip({ availableSeats: 1 }));
    });

    await expect(useCase.execute({ tripId: 'trip-uuid-1', passengerId: 'p-1', seats: 3, idempotencyKey: 'k3' }))
      .rejects.toThrow(ConflictException);
  });

  it('passe le statut du trajet à FULL quand availableSeats atteint 0', async () => {
    const trip = makeTrip({ availableSeats: 2 });
    const booking = makeBooking({ seats: 2 });

    const useCase = buildUseCase((m) => {
      // Pas d'idempotencyKey → pas de findOne pour l'idempotency, juste le trip
      m.findOne.mockResolvedValueOnce(trip);
      m.create.mockReturnValueOnce(booking).mockReturnValueOnce({});
      m.save.mockResolvedValueOnce(booking).mockResolvedValue({});
    });

    await useCase.execute({ tripId: 'trip-uuid-1', passengerId: 'p-1', seats: 2 });

    expect(trip.status).toBe('FULL');
    expect(trip.availableSeats).toBe(0);
  });
});
