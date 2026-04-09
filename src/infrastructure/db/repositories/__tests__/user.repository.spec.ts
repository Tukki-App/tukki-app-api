import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UserRepository } from '../user.repository';
import { User } from '../../../../domains/identity/entities/user.entity';

const mockUser: Partial<User> = {
  id: 'user-uuid-1',
  phone: '+221700000001',
  name: 'Alice',
  role: 'PASSENGER',
};

const mockQueryBuilder: any = {
  addSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  getOne: jest.fn(),
};

const mockRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
};

describe('UserRepository', () => {
  let repository: UserRepository;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UserRepository,
        { provide: getRepositoryToken(User), useValue: mockRepo },
      ],
    }).compile();

    repository = module.get(UserRepository);
    jest.clearAllMocks();
    mockRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);
  });

  it('findById retourne l\'utilisateur correspondant', async () => {
    mockRepo.findOne.mockResolvedValue(mockUser);
    const result = await repository.findById('user-uuid-1');
    expect(result).toEqual(mockUser);
    expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: 'user-uuid-1' } });
  });

  it('findByPhone retourne null si non trouvé', async () => {
    mockRepo.findOne.mockResolvedValue(null);
    const result = await repository.findByPhone('+221700000099');
    expect(result).toBeNull();
  });

  it('findByPhoneWithPassword utilise le query builder avec addSelect', async () => {
    mockQueryBuilder.getOne.mockResolvedValue({ ...mockUser, password: 'hashed' });
    const result = await repository.findByPhoneWithPassword('+221700000001');
    expect(mockQueryBuilder.addSelect).toHaveBeenCalledWith('user.password');
    expect(result?.password).toBe('hashed');
  });

  it('save persiste l\'utilisateur', async () => {
    mockRepo.save.mockResolvedValue(mockUser);
    const result = await repository.save(mockUser);
    expect(result).toEqual(mockUser);
  });
});
