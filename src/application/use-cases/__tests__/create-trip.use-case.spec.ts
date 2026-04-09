import { Test } from '@nestjs/testing';
import { CreateTripUseCase } from '../create-trip.use-case';
import { TripRepository } from '../../../infrastructure/db/repositories/trip.repository';

const mockTrip = {
  id: 'trip-uuid-1',
  driverId: 'driver-uuid-1',
  departureCity: 'dakar',
  destinationCity: 'thiès',
  departureTime: new Date('2026-04-10T08:00:00Z'),
  capacity: 4,
  availableSeats: 4,
  price: 2500,
  status: 'ACTIVE',
};

describe('CreateTripUseCase', () => {
  let useCase: CreateTripUseCase;
  let tripRepository: jest.Mocked<TripRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CreateTripUseCase,
        {
          provide: TripRepository,
          useValue: { save: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get(CreateTripUseCase);
    tripRepository = module.get(TripRepository);
  });

  it('normalise les villes en minuscules et crée le trajet', async () => {
    tripRepository.save.mockResolvedValue(mockTrip as any);

    const result = await useCase.execute({
      driverId: 'driver-uuid-1',
      departureCity: 'Dakar',
      destinationCity: 'Thiès',
      departureTime: '2026-04-10T08:00:00Z',
      capacity: 4,
      price: 2500,
    });

    expect(tripRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      departureCity: 'dakar',
      destinationCity: 'thiès',
      status: 'ACTIVE',
      availableSeats: 4,
    }));
    expect(result).toEqual(mockTrip);
  });

  it('initialise availableSeats à la valeur de capacity', async () => {
    tripRepository.save.mockResolvedValue(mockTrip as any);

    await useCase.execute({
      driverId: 'driver-uuid-1',
      departureCity: 'Dakar',
      destinationCity: 'Thiès',
      departureTime: '2026-04-10T08:00:00Z',
      capacity: 6,
      price: 1000,
    });

    expect(tripRepository.save).toHaveBeenCalledWith(expect.objectContaining({
      capacity: 6,
      availableSeats: 6,
    }));
  });
});
