// Mock otplib before any imports to avoid ESM issues
jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'MOCK_SECRET'),
  generateURI: jest.fn(() => 'otpauth://totp/test'),
  verifySync: jest.fn(() => true),
}));
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => 'data:image/png;base64,mock'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { LineService } from './line.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TotpService } from './totp.service';
import { RedisService } from '../redis/redis.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

// Mock ESM modules
jest.mock('otplib', () => ({
  generateSecret: jest.fn(() => 'MOCK_SECRET'),
  generateURI: jest.fn(() => 'otpauth://totp/test'),
  verifySync: jest.fn(() => true),
}));
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,mock')),
}));

describe('AuthService', () => {
  let service: AuthService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    activityLog: { create: jest.fn() },
    promoterReferral: { findFirst: jest.fn(), create: jest.fn() },
    promoter: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn() },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret-that-is-long-enough-32ch',
        JWT_EXPIRES_IN: '30m',
        LINE_CHANNEL_ID: 'test-channel-id',
        LINE_CHANNEL_SECRET: 'test-channel-secret',
        APP_URL: 'http://localhost:3000',
        ADMIN_LINE_USER_ID: '',
      };
      return config[key];
    }),
  };

  const mockLineService = {
    getAccessToken: jest.fn(),
    getProfile: jest.fn(),
  };

  const mockTotpService = {
    verifyToken: jest.fn(),
    generateSecret: jest.fn(),
    incrementFailedAttempts: jest.fn(),
    clearFailedAttempts: jest.fn(),
    isLockedOut: jest.fn().mockResolvedValue(false),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: LineService, useValue: mockLineService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TotpService, useValue: mockTotpService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('issueFullToken (private)', () => {
    it('should issue access token', async () => {
      const user = { id: 'user-1', name: 'Test', lineUserId: 'line-1', isAdmin: false, isSuperAdmin: false };

      const result = await (service as any).issueFullToken(user);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('user');
    });
  });

  describe('getMe', () => {
    it('should return user with subscription info', async () => {
      const mockUser = {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        isAdmin: false,
        isSuperAdmin: false,
        totpSecret: null,
        subscriptions: [],
        promoter: null,
      };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMe('user-1');

      expect(result).toHaveProperty('id', 'user-1');
      expect(result).toHaveProperty('name', 'Test User');
      // totpSecret should be excluded or converted to boolean
      expect((result as any).totpSecret).toBeFalsy();
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('non-existent')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('consent', () => {
    it('should update consent timestamp', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1', consentAcceptedAt: new Date() });

      const result = await service.acceptConsent('user-1', '1.0', true);

      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({
            consentAcceptedAt: expect.any(Date),
            consentVersion: '1.0',
          }),
        }),
      );
    });
  });

  describe('validateOAuthState', () => {
    it('should reject empty state', () => {
      expect(() => (service as any).validateOAuthState('')).toThrow();
    });
  });
});
