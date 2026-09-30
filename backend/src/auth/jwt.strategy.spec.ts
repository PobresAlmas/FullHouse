import { JwtStrategy } from './jwt.strategy.js';

describe('JwtStrategy', () => {
  it('requires a configured JWT secret', () => {
    const config: any = { getOrThrow: vi.fn().mockReturnValue('test-secret') };
    expect(() => new JwtStrategy(config)).not.toThrow();
    expect(config.getOrThrow).toHaveBeenCalledWith('JWT_SECRET');
  });

  it('maps token claims to the request user shape', () => {
    const config: any = { getOrThrow: vi.fn().mockReturnValue('test-secret') };
    const strategy = new JwtStrategy(config);
    expect(strategy.validate({ sub: 'u1', email: 'a@example.com' } as any)).toEqual({ id: 'u1', email: 'a@example.com' });
  });
});
