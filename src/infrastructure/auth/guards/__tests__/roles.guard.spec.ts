import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../roles.guard';
import { ROLES_KEY } from '../../decorators/roles.decorator';

const makeContext = (user: any, handler = {}, cls = {}) => ({
  getHandler: () => handler,
  getClass: () => cls,
  switchToHttp: () => ({
    getRequest: () => ({ user }),
  }),
});

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new RolesGuard(reflector);
  });

  it('autorise si aucun rôle requis', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext({ role: 'PASSENGER' }) as any)).toBe(true);
  });

  it('autorise si le rôle correspond', () => {
    reflector.getAllAndOverride.mockReturnValue(['DRIVER']);
    expect(guard.canActivate(makeContext({ role: 'DRIVER' }) as any)).toBe(true);
  });

  it('lève ForbiddenException si le rôle ne correspond pas', () => {
    reflector.getAllAndOverride.mockReturnValue(['DRIVER']);
    expect(() => guard.canActivate(makeContext({ role: 'PASSENGER' }) as any))
      .toThrow(ForbiddenException);
  });

  it('lève ForbiddenException si pas d\'utilisateur', () => {
    reflector.getAllAndOverride.mockReturnValue(['DRIVER']);
    expect(() => guard.canActivate(makeContext(null) as any))
      .toThrow(ForbiddenException);
  });
});
