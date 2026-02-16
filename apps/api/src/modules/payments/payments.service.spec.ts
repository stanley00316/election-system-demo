import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ReferralsService } from '../referrals/referrals.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EcpayProvider } from './providers/ecpay.provider';
import { NewebpayProvider } from './providers/newebpay.provider';
import { StripeProvider } from './providers/stripe.provider';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentProvider, PaymentStatus } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockPrisma = {
    payment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    subscription: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    activityLog: { create: jest.fn() },
    promoterReferral: { findUnique: jest.fn(), update: jest.fn() },
    trialInvite: { findUnique: jest.fn(), update: jest.fn() },
  };

  const mockConfig = {
    get: jest.fn((key: string, defaultVal?: string) => {
      const config: Record<string, string> = {
        APP_URL: 'http://localhost:3000',
        CORS_ORIGIN: 'http://localhost:3000',
      };
      return config[key] || defaultVal || '';
    }),
  };

  const mockSubscriptions = { activateSubscription: jest.fn(), cancelSubscription: jest.fn() };
  const mockReferrals = { grantReferralReward: jest.fn() };
  const mockNotifications = {
    sendPaymentSuccessNotification: jest.fn(),
    sendPaymentFailedNotification: jest.fn(),
  };
  const mockEcpay = { createPayment: jest.fn(), verifyCallback: jest.fn(), refund: jest.fn() };
  const mockNewebpay = { createPayment: jest.fn(), verifyCallback: jest.fn(), refund: jest.fn() };
  const mockStripe = { createPayment: jest.fn(), verifyCallback: jest.fn(), queryTransaction: jest.fn(), refund: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
        { provide: SubscriptionsService, useValue: mockSubscriptions },
        { provide: ReferralsService, useValue: mockReferrals },
        { provide: NotificationsService, useValue: mockNotifications },
        { provide: EcpayProvider, useValue: mockEcpay },
        { provide: NewebpayProvider, useValue: mockNewebpay },
        { provide: StripeProvider, useValue: mockStripe },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should throw if subscription not found', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue(null);

      await expect(
        service.createPayment('user-1', 'sub-1', PaymentProvider.STRIPE),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw if user does not own subscription', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'other-user',
        status: 'TRIAL',
        plan: { price: 1990 },
        user: { name: 'Other' },
      });

      await expect(
        service.createPayment('user-1', 'sub-1', PaymentProvider.STRIPE),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if subscription status is not payable', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        status: 'CANCELLED',
        plan: { price: 1990 },
        user: { name: 'Test' },
      });

      await expect(
        service.createPayment('user-1', 'sub-1', PaymentProvider.STRIPE),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if there is already a pending payment', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        status: 'TRIAL',
        plan: { price: 1990 },
        user: { name: 'Test' },
        customPrice: null,
        priceAdjustment: null,
      });
      mockPrisma.payment.findFirst.mockResolvedValue({ id: 'pay-existing' });

      await expect(
        service.createPayment('user-1', 'sub-1', PaymentProvider.STRIPE),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create payment successfully with Stripe', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        status: 'TRIAL',
        plan: { price: 1990, name: 'Monthly' },
        user: { name: 'Test', email: 'test@mail.com' },
        customPrice: null,
        priceAdjustment: null,
      });
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-1', amount: 1990 });
      mockPrisma.payment.update.mockResolvedValue({ id: 'pay-1' });
      mockStripe.createPayment.mockResolvedValue({
        success: true,
        paymentUrl: 'https://checkout.stripe.com/xxx',
        transactionId: 'cs_test_123',
      });

      const result = await service.createPayment('user-1', 'sub-1', PaymentProvider.STRIPE);

      expect(result).toHaveProperty('paymentId', 'pay-1');
      expect(result).toHaveProperty('paymentUrl', 'https://checkout.stripe.com/xxx');
    });
  });

  describe('getPayment', () => {
    it('should throw if payment not found', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.getPayment('pay-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw if user does not own payment (IDOR protection)', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        subscription: { userId: 'other-user', plan: {}, user: {} },
      });

      await expect(service.getPayment('pay-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('refundPayment', () => {
    it('should throw if payment is not completed', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        id: 'pay-1',
        status: PaymentStatus.PENDING,
        subscription: { userId: 'user-1' },
      });

      await expect(service.refundPayment('pay-1', 'user-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('returnUrl validation (OWASP A10)', () => {
    it('should reject returnUrl from untrusted domain', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        userId: 'user-1',
        status: 'TRIAL',
        plan: { price: 1990, name: 'Monthly' },
        user: { name: 'Test', email: 'test@mail.com' },
        customPrice: null,
        priceAdjustment: null,
      });
      mockPrisma.payment.findFirst.mockResolvedValue(null);
      mockPrisma.payment.create.mockResolvedValue({ id: 'pay-1', amount: 1990 });
      mockPrisma.payment.update.mockResolvedValue({ id: 'pay-1' });
      mockStripe.createPayment.mockResolvedValue({
        success: true,
        paymentUrl: 'https://checkout.stripe.com/xxx',
        transactionId: 'cs_test_123',
      });

      const result = await service.createPayment(
        'user-1',
        'sub-1',
        PaymentProvider.STRIPE,
        'https://evil.com/steal',
      );

      // returnUrl should be sanitized to default
      expect(mockStripe.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          returnUrl: expect.stringContaining('localhost:3000'),
        }),
      );
    });
  });
});
