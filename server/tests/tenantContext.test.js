// server/tests/tenantContext.test.js - Unit Tests

const TenantContext = require('../context/TenantContext');

describe('TenantContext', () => {
  const jwtSecret = 'test-secret-key-123';

  describe('Constructor', () => {
    test('should create TenantContext with valid parameters', () => {
      const context = new TenantContext('tenant-1', 'user-1', 'user@example.com');

      expect(context.tenantId).toBe('tenant-1');
      expect(context.userId).toBe('user-1');
      expect(context.userEmail).toBe('user@example.com');
      expect(context.createdAt).toBeDefined();
    });

    test('should throw error if tenantId is missing', () => {
      expect(() => new TenantContext(null, 'user-1', 'user@example.com')).toThrow(
        'tenantId è obbligatorio'
      );
    });

    test('should throw error if tenantId is empty string', () => {
      expect(() => new TenantContext('', 'user-1', 'user@example.com')).toThrow(
        'tenantId è obbligatorio'
      );
    });
  });

  describe('fromJWT', () => {
    test('should create TenantContext from valid JWT token', async () => {
      const token = TenantContext.generateToken(
        'user-1',
        'tenant-1',
        'user@example.com',
        jwtSecret
      );

      const context = await TenantContext.fromJWT(token, jwtSecret);

      expect(context.tenantId).toBe('tenant-1');
      expect(context.userId).toBe('user-1');
      expect(context.userEmail).toBe('user@example.com');
    });

    test('should throw error if token is missing', async () => {
      await expect(TenantContext.fromJWT(null, jwtSecret)).rejects.toThrow(
        'Token non fornito'
      );
    });

    test('should throw error if token is invalid', async () => {
      await expect(
        TenantContext.fromJWT('invalid-token', jwtSecret)
      ).rejects.toThrow('Token non valido');
    });

    test('should throw error if token missing tenantId', async () => {
      const jwt = require('jsonwebtoken');
      const invalidToken = jwt.sign(
        { userId: 'user-1', email: 'user@example.com' },
        jwtSecret
      );

      await expect(TenantContext.fromJWT(invalidToken, jwtSecret)).rejects.toThrow(
        'tenantId non trovato nel token'
      );
    });
  });

  describe('generateToken', () => {
    test('should generate valid JWT token', () => {
      const token = TenantContext.generateToken(
        'user-1',
        'tenant-1',
        'user@example.com',
        jwtSecret
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      // Verifica che il token contenga le informazioni corrette
      const decoded = require('jsonwebtoken').verify(token, jwtSecret);
      expect(decoded.userId).toBe('user-1');
      expect(decoded.tenantId).toBe('tenant-1');
      expect(decoded.email).toBe('user@example.com');
    });

    test('should generate token with custom expiration', () => {
      const token = TenantContext.generateToken(
        'user-1',
        'tenant-1',
        'user@example.com',
        jwtSecret,
        '7d'
      );

      const decoded = require('jsonwebtoken').verify(token, jwtSecret);
      expect(decoded.iat).toBeDefined();
    });
  });

  describe('hasAccessToResource', () => {
    test('should return true if user owns resource', () => {
      const context = new TenantContext('tenant-1', 'user-1', 'user@example.com');
      expect(context.hasAccessToResource('user-1')).toBe(true);
    });

    test('should return false if user does not own resource', () => {
      const context = new TenantContext('tenant-1', 'user-1', 'user@example.com');
      expect(context.hasAccessToResource('user-2')).toBe(false);
    });
  });

  describe('toJSON', () => {
    test('should serialize TenantContext correctly', () => {
      const context = new TenantContext('tenant-1', 'user-1', 'user@example.com');
      const json = context.toJSON();

      expect(json).toHaveProperty('tenantId', 'tenant-1');
      expect(json).toHaveProperty('userId', 'user-1');
      expect(json).toHaveProperty('userEmail', 'user@example.com');
      expect(json).toHaveProperty('createdAt');
    });
  });

  describe('Isolation scenarios', () => {
    test('should not allow cross-tenant access', () => {
      const context1 = new TenantContext('tenant-1', 'user-1', 'user1@example.com');
      const context2 = new TenantContext('tenant-2', 'user-2', 'user2@example.com');

      // Gli utenti dovrebbero essere isolati
      expect(context1.tenantId).not.toBe(context2.tenantId);
      expect(context1.userId).not.toBe(context2.userId);
    });

    test('should generate different tokens for different tenants', () => {
      const token1 = TenantContext.generateToken(
        'user-1',
        'tenant-1',
        'user@example.com',
        jwtSecret
      );

      const token2 = TenantContext.generateToken(
        'user-1',
        'tenant-2', // Tenant diverso
        'user@example.com',
        jwtSecret
      );

      expect(token1).not.toBe(token2);
    });
  });
});
