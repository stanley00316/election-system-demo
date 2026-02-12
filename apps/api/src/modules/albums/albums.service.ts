import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { PhotosService } from '../photos/photos.service';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { AlbumFilterDto } from './dto/album-filter.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class AlbumsService {
  private readonly logger = new Logger(AlbumsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignsService: CampaignsService,
    private readonly photosService: PhotosService,
  ) {}

  /**
   * 建立相簿
   */
  async create(dto: CreateAlbumDto, userId: string) {
    // OWASP A01: 驗證 Campaign 存取權限（需 EDITOR+）
    await this.campaignsService.checkCampaignAccess(
      dto.campaignId,
      userId,
      ['ADMIN', 'EDITOR'] as any,
    );

    // 如果指定了 eventId，驗證活動屬於同一 campaign
    if (dto.eventId) {
      const event = await this.prisma.event.findUnique({
        where: { id: dto.eventId },
      });
      if (!event || event.campaignId !== dto.campaignId) {
        throw new BadRequestException('活動不存在或不屬於此選舉活動');
      }
    }

    const album = await this.prisma.album.create({
      data: {
        campaignId: dto.campaignId,
        eventId: dto.eventId || null,
        title: dto.title,
        description: dto.description || null,
        createdBy: userId,
      },
      include: {
        event: { select: { id: true, name: true } },
        _count: { select: { photos: true } },
      },
    });

    this.logger.log(
      `相簿已建立: id=${album.id}, campaign=${dto.campaignId}, user=${userId}`,
    );

    return album;
  }

  /**
   * 列出相簿
   */
  async findAll(filter: AlbumFilterDto, userId: string) {
    // OWASP A01: 驗證 Campaign 存取權限
    await this.campaignsService.checkCampaignAccess(filter.campaignId, userId);

    const where: any = { campaignId: filter.campaignId };

    if (filter.eventId) {
      where.eventId = filter.eventId;
    }

    if (filter.isPublished !== undefined) {
      where.isPublished = filter.isPublished === 'true';
    }

    const albums = await this.prisma.album.findMany({
      where,
      include: {
        event: { select: { id: true, name: true } },
        coverPhoto: {
          select: { id: true, storageKey: true, thumbnailKey: true },
        },
        _count: { select: { photos: true } },
        creator: { select: { id: true, name: true } },
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    // 為封面照片生成 URL
    return Promise.all(
      albums.map(async (album) => ({
        ...album,
        coverPhoto: album.coverPhoto
          ? {
              ...album.coverPhoto,
              thumbnailUrl: album.coverPhoto.thumbnailKey
                ? await this.photosService.getSignedUrl(album.coverPhoto.thumbnailKey)
                : await this.photosService.getSignedUrl(album.coverPhoto.storageKey),
            }
          : null,
      })),
    );
  }

  /**
   * 取得相簿詳情（含照片列表）
   */
  async findById(id: string, userId: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: {
        event: { select: { id: true, name: true } },
        creator: { select: { id: true, name: true } },
        coverPhoto: { select: { id: true } },
        photos: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          include: {
            uploader: { select: { id: true, name: true } },
          },
        },
        _count: { select: { photos: true } },
      },
    });

    if (!album) {
      throw new NotFoundException('相簿不存在');
    }

    // OWASP A01: 驗證 Campaign 存取權限
    await this.campaignsService.checkCampaignAccess(album.campaignId, userId);

    // 為照片生成 URL
    const photosWithUrls = await Promise.all(
      album.photos.map(async (photo) => ({
        ...photo,
        url: await this.photosService.getSignedUrl(photo.storageKey),
        thumbnailUrl: photo.thumbnailKey
          ? await this.photosService.getSignedUrl(photo.thumbnailKey)
          : null,
      })),
    );

    return {
      ...album,
      photos: photosWithUrls,
    };
  }

  /**
   * 更新相簿
   */
  async update(id: string, dto: UpdateAlbumDto, userId: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
    });

    if (!album) {
      throw new NotFoundException('相簿不存在');
    }

    // OWASP A01: 需 EDITOR+
    await this.campaignsService.checkCampaignAccess(
      album.campaignId,
      userId,
      ['ADMIN', 'EDITOR'] as any,
    );

    return this.prisma.album.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        sortOrder: dto.sortOrder,
      },
      include: {
        event: { select: { id: true, name: true } },
        _count: { select: { photos: true } },
      },
    });
  }

  /**
   * 刪除相簿（含所有照片）
   */
  async delete(id: string, userId: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
      include: { photos: true },
    });

    if (!album) {
      throw new NotFoundException('相簿不存在');
    }

    // OWASP A01: 需 EDITOR+
    await this.campaignsService.checkCampaignAccess(
      album.campaignId,
      userId,
      ['ADMIN', 'EDITOR'] as any,
    );

    // 刪除所有照片的儲存檔案
    for (const photo of album.photos) {
      await this.photosService.delete(photo.id, userId).catch(() => {
        this.logger.warn(`刪除照片失敗: ${photo.id}`);
      });
    }

    // 刪除相簿（CASCADE 會刪除 DB 中的照片記錄）
    await this.prisma.album.delete({ where: { id } });

    this.logger.log(`相簿已刪除: id=${id}, user=${userId}`);

    return { success: true };
  }

  /**
   * 發表相簿（生成公開連結）
   */
  async publish(id: string, userId: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
    });

    if (!album) {
      throw new NotFoundException('相簿不存在');
    }

    // OWASP A01: 需 EDITOR+
    await this.campaignsService.checkCampaignAccess(
      album.campaignId,
      userId,
      ['ADMIN', 'EDITOR'] as any,
    );

    // 生成唯一的 slug
    const slug = album.publishSlug || this.generateSlug();

    const updated = await this.prisma.album.update({
      where: { id },
      data: {
        isPublished: true,
        publishedAt: new Date(),
        publishSlug: slug,
      },
    });

    this.logger.log(`相簿已發表: id=${id}, slug=${slug}, user=${userId}`);

    return {
      ...updated,
      publicUrl: `/p/${slug}`,
    };
  }

  /**
   * 取消發表相簿
   */
  async unpublish(id: string, userId: string) {
    const album = await this.prisma.album.findUnique({
      where: { id },
    });

    if (!album) {
      throw new NotFoundException('相簿不存在');
    }

    // OWASP A01: 需 EDITOR+
    await this.campaignsService.checkCampaignAccess(
      album.campaignId,
      userId,
      ['ADMIN', 'EDITOR'] as any,
    );

    return this.prisma.album.update({
      where: { id },
      data: {
        isPublished: false,
        publishedAt: null,
      },
    });
  }

  /**
   * 設定封面照片
   */
  async setCoverPhoto(albumId: string, photoId: string, userId: string) {
    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album) {
      throw new NotFoundException('相簿不存在');
    }

    // OWASP A01: 需 EDITOR+
    await this.campaignsService.checkCampaignAccess(
      album.campaignId,
      userId,
      ['ADMIN', 'EDITOR'] as any,
    );

    // 驗證照片存在且屬於此相簿
    const photo = await this.prisma.photo.findUnique({
      where: { id: photoId },
    });

    if (!photo || photo.albumId !== albumId) {
      throw new BadRequestException('照片不存在或不屬於此相簿');
    }

    return this.prisma.album.update({
      where: { id: albumId },
      data: { coverPhotoId: photoId },
    });
  }

  /**
   * 重新排序照片
   */
  async reorderPhotos(
    albumId: string,
    photoIds: string[],
    userId: string,
  ) {
    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
    });

    if (!album) {
      throw new NotFoundException('相簿不存在');
    }

    // OWASP A01: 需 EDITOR+
    await this.campaignsService.checkCampaignAccess(
      album.campaignId,
      userId,
      ['ADMIN', 'EDITOR'] as any,
    );

    // 批次更新 sortOrder
    const updates = photoIds.map((photoId, index) =>
      this.prisma.photo.update({
        where: { id: photoId },
        data: { sortOrder: index },
      }),
    );

    await this.prisma.$transaction(updates);

    return { success: true };
  }

  /**
   * 取得公開相簿（不需要登入）
   */
  async findPublicBySlug(slug: string) {
    const album = await this.prisma.album.findUnique({
      where: { publishSlug: slug },
      include: {
        photos: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        },
        campaign: {
          select: { name: true },
        },
        _count: { select: { photos: true } },
      },
    });

    if (!album || !album.isPublished) {
      throw new NotFoundException('相簿不存在或未發表');
    }

    // 公開相簿使用公開 URL
    const photosWithUrls = album.photos.map((photo) => ({
      ...photo,
      url: this.photosService.getPublicUrl(photo.storageKey),
      thumbnailUrl: photo.thumbnailKey
        ? this.photosService.getPublicUrl(photo.thumbnailKey)
        : null,
    }));

    return {
      id: album.id,
      title: album.title,
      description: album.description,
      publishedAt: album.publishedAt,
      campaignName: album.campaign.name,
      photoCount: album._count.photos,
      photos: photosWithUrls,
    };
  }

  // ==================== 私有方法 ====================

  /**
   * 生成 8 字元隨機 slug
   */
  private generateSlug(): string {
    return randomBytes(6).toString('base64url').slice(0, 8);
  }
}
