import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;

  const mockPrisma = {
    subscription: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    plan: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    campaign: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    activityLog: { create: jest.fn() },
    trialInvite: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((fn) => fn(mockPrisma)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SubscriptionsService>(SubscriptionsService);
    jest.clearAllMocks();
  });

  describe('getCurrentSubscription', () => {
    it('should return null if no active subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      const result = await service.getCurrentSubscription('user-1');

      expect(result).toBeNull();
    });

    it('should return subscription if active and not expired', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        currentPeriodEnd: futureDate,
        plan: { name: 'Monthly' },
      });

      const result = await service.getCurrentSubscription('user-1');

      expect(result).toHaveProperty('id', 'sub-1');
    });

    it('should expire subscription if past currentPeriodEnd', async () => {
      const pastDate = new Date(Date.now() - 86400000);
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        status: 'ACTIVE',
        currentPeriodEnd: pastDate,
        plan: { name: 'Monthly' },
      });
      mockPrisma.subscription.update.mockResolvedValue({ id: 'sub-1', status: 'EXPIRED' });

      const result = await service.getCurrentSubscription('user-1');

      expect(result).toBeNull();
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'EXPIRED' },
        }),
      );
    });
  });

  describe('hasActiveSubscription', () => {
    it('should return true if user has active subscription', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        currentPeriodEnd: futureDate,
      });

      const result = await service.hasActiveSubscription('user-1');

      expect(result).toBe(true);
    });

    it('should return false if no active subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      const result = await service.hasActiveSubscription('user-1');

      expect(result).toBe(false);
    });
  });

  describe('startTrial', () => {
    it('should throw if user already has subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.startTrial('user-1')).rejects.toThrow(BadRequestException);
    });

    it('should create trial subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);
      mockPrisma.plan.findFirst.mockResolvedValue({ id: 'plan-trial', code: 'FREE_TRIAL' });
      mockPrisma.subscription.create.mockResolvedValue({
        id: 'sub-new',
        status: 'TRIAL',
        plan: { name: 'Free Trial' },
      });

      const result = await service.startTrial('user-1');

      expect(result).toHaveProperty('status', 'TRIAL');
      expect(mockPrisma.subscription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            status: 'TRIAL',
          }),
        }),
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should throw if no active subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      await expect(service.cancelSubscription('user-1')).rejects.toThrow(NotFoundException);
    });

    it('should cancel subscription with reason', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({ id: 'sub-1' });
      mockPrisma.subscription.update.mockResolvedValue({
        id: 'sub-1',
        status: 'CANCELLED',
        cancelReason: 'Too expensive',
        plan: {},
      });

      const result = await service.cancelSubscription('user-1', 'Too expensive');

      expect(result).toHaveProperty('status', 'CANCELLED');
    });
  });

  describe('previewUpgrade', () => {
    it('should throw if no active subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      await expect(service.previewUpgrade('user-1', 'plan-2')).rejects.toThrow(NotFoundException);
    });

    it('should throw if new plan is cheaper', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 30);
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        plan: { price: 1990 },
        currentPeriodStart: new Date(),
        currentPeriodEnd: futureDate,
      });
      mockPrisma.plan.findUnique.mockResolvedValue({ id: 'plan-cheap', price: 990, isActive: true });

      await expect(service.previewUpgrade('user-1', 'plan-cheap')).rejects.toThrow(BadRequestException);
    });

    it('should calculate prorated amount correctly', async () => {
      const now = new Date();
      const start = new Date(now.getTime() - 15 * 86400000); // 15 days ago
      const end = new Date(now.getTime() + 15 * 86400000); // 15 days from now
      mockPrisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        plan: { price: 1000 },
        currentPeriodStart: start,
        currentPeriodEnd: end,
      });
      mockPrisma.plan.findUnique.mockResolvedValue({ id: 'plan-pro', price: 2000, isActive: true });

      const result = await service.previewUpgrade('user-1', 'plan-pro');

      expect(result.proratedAmount).toBeGreaterThan(0);
      expect(result.proratedAmount).toBeLessThanOrEqual(1000);
      expect(result.effectiveImmediately).toBe(true);
    });
  });

  describe('checkAndExpireSubscriptions', () => {
    it('should expire overdue subscriptions', async () => {
      mockPrisma.subscription.updateMany.mockResolvedValue({ count: 3 });

      const count = await service.checkAndExpireSubscriptions();

      expect(count).toBe(3);
      expect(mockPrisma.subscription.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'EXPIRED' },
        }),
      );
    });
  });

  describe('toggleAutoRenew', () => {
    it('should throw if no active subscription', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      await expect(service.toggleAutoRenew('user-1', true)).rejects.toThrow(NotFoundException);
    });
  });
});
