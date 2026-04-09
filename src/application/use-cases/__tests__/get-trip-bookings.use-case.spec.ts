import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { GetTripBookingsUseCase } from '../get-trip-bookings.use-case';
import { BookingRepository } from '../../../infrastructure/db/repositories/booking.repository';
import { TripRepository } from '../../../infrastructure/db/repositories/trip.repository';

describe('GetTripBookingsUseCase', () => {
  let useCase: GetTripBookingsUseCase;
  let bookingRepository: jest.Mocked<BookingRepository>;
  let tripRepository: jest.Mocked<TripRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GetTripBookingsUseCase,
        { provide: BookingRepository, useValue: { findByTripId: jest.fn() } },
        { provide: TripRepository, useValue: { findById: jest.fn() } },
      ],
    }).compile();

    useCase = module.get(GetTripBookingsUseCase);
    bookingRepository = module.get(BookingRepository);
    tripRepository = module.get(TripRepository);
  });

  it('retourne les réservations du trajet si le chauffeur est propriétaire', async () => {
    const trip = { id: 'trip-uuid-1', driverId: 'driver-uuid-1' };
    const bookings = [{ id: 'b-1' }, { id: 'b-2' }];

    tripRepository.findById.mockResolvedValue(trip as any);
    bookingRepository.findByTripId.mockResolvedValue(bookings as any);

    const result = await useCase.execute('trip-uuid-1', 'driver-uuid-1');

    expect(result).toEqual(bookings);
    expect(bookingRepository.findByTripId).toHaveBeenCalledWith('trip-uuid-1');
  });

  it('lève NotFoundException si le trajet n\'existe pas', async () => {
    tripRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('trip-uuid-999', 'driver-uuid-1'))
      .rejects.toThrow(NotFoundException);
  });

  it('lève ForbiddenException si le chauffeur ne possède pas le trajet', async () => {
    tripRepository.findById.mockResolvedValue({ id: 'trip-uuid-1', driverId: 'other-driver' } as any);

    await expect(useCase.execute('trip-uuid-1', 'driver-uuid-1'))
      .rejects.toThrow(ForbiddenException);
  });
});
