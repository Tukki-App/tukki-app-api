import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UpdateBookingStatusUseCase } from '../update-booking-status.use-case';
import { BookingRepository } from '../../../infrastructure/db/repositories/booking.repository';

const makeBooking = (driverId = 'driver-uuid-1') => ({
  id: 'booking-uuid-1',
  status: 'PENDING',
  trip: { driverId },
});

describe('UpdateBookingStatusUseCase', () => {
  let useCase: UpdateBookingStatusUseCase;
  let bookingRepository: jest.Mocked<BookingRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UpdateBookingStatusUseCase,
        {
          provide: BookingRepository,
          useValue: { findById: jest.fn(), save: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(UpdateBookingStatusUseCase);
    bookingRepository = module.get(BookingRepository);
  });

  it('confirme une réservation si le chauffeur est propriétaire du trajet', async () => {
    const booking = makeBooking('driver-uuid-1');
    bookingRepository.findById.mockResolvedValue(booking as any);
    bookingRepository.save.mockResolvedValue({ ...booking, status: 'CONFIRMED' } as any);

    const result = await useCase.execute('booking-uuid-1', 'driver-uuid-1', { status: 'CONFIRMED' });

    expect(result.status).toBe('CONFIRMED');
    expect(bookingRepository.save).toHaveBeenCalledWith(expect.objectContaining({ status: 'CONFIRMED' }));
  });

  it('lève NotFoundException si la réservation n\'existe pas', async () => {
    bookingRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute('booking-uuid-999', 'driver-uuid-1', { status: 'CONFIRMED' }))
      .rejects.toThrow(NotFoundException);
  });

  it('lève ForbiddenException si le chauffeur ne possède pas le trajet', async () => {
    bookingRepository.findById.mockResolvedValue(makeBooking('other-driver-uuid') as any);

    await expect(useCase.execute('booking-uuid-1', 'driver-uuid-1', { status: 'CONFIRMED' }))
      .rejects.toThrow(ForbiddenException);
  });
});
