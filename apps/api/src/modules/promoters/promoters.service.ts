import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import {
  PromoterStatus,
  PromoterType,
  TrialInviteStatus,
} from '@prisma/client';
import { RegisterPromoterDto } from './dto/register-promoter.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class PromotersService {
  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * 產生推廣碼
   */
  private generateReferralCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    const bytes = randomBytes(8);
    for (let i = 0; i < 8; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  /**
   * 外部推廣者自助註冊
   */
  async registerExternalPromoter(dto: RegisterPromoterDto) {
    // 檢查是否已有相同 email/phone 的推廣者
    if (dto.email) {
      const existing = await this.prisma.promoter.findFirst({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('此 Email 已有推廣者帳號');
      }
    }

    if (dto.phone) {
      const existing = await this.prisma.promoter.findFirst({
        where: { phone: dto.phone },
      });
      if (existing) {
        throw new ConflictException('此電話號碼已有推廣者帳號');
      }
    }

    // 產生唯一推廣碼
    let referralCode: string;
    let exists = true;
    do {
      referralCode = this.generateReferralCode();
      const existing = await this.prisma.promoter.findUnique({ where: { referralCode } });
      exists = !!existing;
    } while (exists);

    // 建立待審核推廣者
    const promoter = await this.prisma.promoter.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        lineId: dto.lineId,
        referralCode,
        type: PromoterType.EXTERNAL,
        status: PromoterStatus.PENDING,
        isActive: false,
        notes: dto.notes,
      },
    });

    return {
      success: true,
      message: '申請已送出，請等待管理員審核',
      promoter: {
        id: promoter.id,
        name: promoter.name,
        referralCode: promoter.referralCode,
        status: promoter.status,
      },
    };
  }

  /**
   * 驗證推廣碼是否有效
   */
  async validatePromoterCode(code: string) {
    const promoter = await this.prisma.promoter.findUnique({
      where: { referralCode: code.toUpperCase() },
      select: {
        id: true,
        name: true,
        referralCode: true,
        isActive: true,
        status: true,
      },
    });

    if (!promoter || !promoter.isActive) {
      return { valid: false, message: '無效的推廣碼' };
    }

    return {
      valid: true,
      promoter: {
        name: promoter.name,
        referralCode: promoter.referralCode,
      },
    };
  }

  /**
   * 記錄 ?ref=CODE 追蹤點擊
   * 先查 Promoter.referralCode，再 fallback 查 User.referralCode
   */
  async trackRefClick(
    code: string,
    url?: string,
    ip?: string,
    userAgent?: string,
    referer?: string,
  ) {
    const upperCode = code.toUpperCase();

    // 先查推廣者
    const promoter = await this.prisma.promoter.findUnique({
      where: { referralCode: upperCode },
      select: { id: true, name: true, isActive: true },
    });

    if (promoter && promoter.isActive) {
      // 找到該推廣者的 REF_LINK 分享連結，若不存在則自動建立
      let shareLink = await this.prisma.shareLink.findFirst({
        where: { promoterId: promoter.id, channel: 'REF_LINK' },
      });

      if (!shareLink) {
        shareLink = await this.prisma.shareLink.create({
          data: {
            promoterId: promoter.id,
            code: `REF-${upperCode}`,
            channel: 'REF_LINK',
            targetUrl: url || null,
            clickCount: 0,
          },
        });
      }

      await this.prisma.shareLinkClick.create({
        data: {
          shareLinkId: shareLink.id,
          ipAddress: ip?.substring(0, 45),
          userAgent: userAgent?.substring(0, 500),
          referer: referer?.substring(0, 500),
        },
      });
      await this.prisma.shareLink.update({
        where: { id: shareLink.id },
        data: { clickCount: { increment: 1 } },
      });

      return { tracked: true, type: 'promoter', name: promoter.name };
    }

    // Fallback: 查 User.referralCode
    const user = await this.prisma.user.findFirst({
      where: { referralCode: upperCode },
      select: { id: true, name: true },
    });

    if (user) {
      return { tracked: true, type: 'user', name: user.name };
    }

    return { tracked: false, message: '無效的推廣碼' };
  }

  /**
   * 取得分享連結資訊並記錄點擊
   */
  async getShareLinkAndRecordClick(
    code: string,
    ip?: string,
    userAgent?: string,
    referer?: string,
  ) {
    const shareLink = await this.prisma.shareLink.findUnique({
      where: { code },
      include: {
        promoter: {
          select: { id: true, name: true, referralCode: true, isActive: true },
        },
      },
    });

    if (!shareLink || !shareLink.isActive) {
      throw new NotFoundException('分享連結不存在或已失效');
    }

    if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
      throw new BadRequestException('分享連結已過期');
    }

    // 記錄點擊
    await this.prisma.shareLinkClick.create({
      data: {
        shareLinkId: shareLink.id,
        ipAddress: ip,
        userAgent,
        referer,
      },
    });

    // 更新點擊數
    await this.prisma.shareLink.update({
      where: { id: shareLink.id },
      data: { clickCount: { increment: 1 } },
    });

    return {
      promoter: {
        name: shareLink.promoter.name,
        referralCode: shareLink.promoter.referralCode,
      },
      channel: shareLink.channel,
      targetUrl: shareLink.targetUrl,
    };
  }

  /**
   * 取得試用邀請資訊
   */
  async getTrialInviteInfo(code: string) {
    const trialInvite = await this.prisma.trialInvite.findUnique({
      where: { code },
      include: {
        promoter: { select: { id: true, name: true } },
        plan: { select: { id: true, name: true, features: true } },
      },
    });

    if (!trialInvite) {
      throw new NotFoundException('試用邀請碼不存在');
    }

    // 更新點擊計數
    await this.prisma.trialInvite.update({
      where: { id: trialInvite.id },
      data: {
        linkClickCount: { increment: 1 },
        lastClickedAt: new Date(),
      },
    });

    const isAvailable = ['PENDING', 'SENT'].includes(trialInvite.status);

    return {
      code: trialInvite.code,
      trialDays: trialInvite.trialDays,
      promoterName: trialInvite.promoter.name,
      plan: trialInvite.plan,
      status: trialInvite.status,
      isAvailable,
      message: isAvailable ? '此試用邀請碼可以使用' : '此試用邀請碼已被使用或已失效',
    };
  }

  /**
   * 已登入使用者認領試用
   */
  async claimTrial(userId: string, trialInviteCode: string) {
    // 使用 SubscriptionsService 來處理試用啟動
    const subscription = await this.subscriptionsService.startPromoterTrial(userId, trialInviteCode);

    return {
      success: true,
      message: '試用已啟動',
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        trialEndsAt: subscription.trialEndsAt,
      },
    };
  }

  /**
   * 已登入使用者套用推廣碼
   */
  async applyPromoterReferral(userId: string, promoterCode: string) {
    // 查找推廣者
    const promoter = await this.prisma.promoter.findUnique({
      where: { referralCode: promoterCode.toUpperCase() },
    });

    if (!promoter || !promoter.isActive) {
      throw new BadRequestException('無效的推廣碼');
    }

    // 不能使用自己的推廣碼（如果推廣者有綁定使用者帳號）
    if (promoter.userId === userId) {
      throw new BadRequestException('不能使用自己的推廣碼');
    }

    // 檢查使用者是否已有推廣者推薦記錄
    const existingReferral = await this.prisma.promoterReferral.findUnique({
      where: { referredUserId: userId },
    });

    if (existingReferral) {
      throw new ConflictException('您已經使用過推廣碼');
    }

    // 建立推廣者推薦記錄
    const referral = await this.prisma.promoterReferral.create({
      data: {
        promoterId: promoter.id,
        referredUserId: userId,
        status: 'REGISTERED',
        registeredAt: new Date(),
      },
    });

    return {
      success: true,
      message: '推廣碼套用成功',
      referral: {
        id: referral.id,
        promoterName: promoter.name,
        status: referral.status,
      },
    };
  }
}
