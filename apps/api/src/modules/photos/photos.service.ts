import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import * as path from 'path';

/** 原圖壓縮：最大長邊 2048px，JPEG 品質 85% */
const MAX_DIMENSION = 2048;
const JPEG_QUALITY = 85;

/** 縮圖規格：300x300，JPEG 品質 80% */
const THUMB_SIZE = 300;
const THUMB_QUALITY = 80;

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly campaignsService: CampaignsService,
  ) {}

  /**
   * 上傳單張照片
   * 流程：驗證 → 壓縮/調整尺寸 → 生成縮圖 → 儲存 → 建立 DB 記錄
   */
  async upload(
    file: Express.Multer.File,
    dto: UploadPhotoDto,
    userId: string,
  ) {
    // OWASP A01: 驗證 Campaign 存取權限
    await this.campaignsService.checkCampaignAccess(dto.campaignId, userId);

    // 處理圖片
    const { processedBuffer, metadata } = await this.processImage(file.buffer);
    const { thumbBuffer } = await this.generateThumbnail(file.buffer);

    // 生成 storage keys（UUID，不暴露原始檔名）
    const fileId = uuidv4();
    const ext = '.jpg'; // 統一轉為 JPEG
    const storageKey = `photos/${dto.campaignId}/${fileId}${ext}`;
    const thumbnailKey = `photos/${dto.campaignId}/${fileId}_thumb${ext}`;

    // 上傳至儲存服務
    await Promise.all([
      this.storage.upload(storageKey, processedBuffer, 'image/jpeg'),
      this.storage.upload(thumbnailKey, thumbBuffer, 'image/jpeg'),
    ]);

    // 建立 DB 記錄
    const photo = await this.prisma.photo.create({
      data: {
        campaignId: dto.campaignId,
        albumId: dto.albumId || null,
        voterId: dto.voterId || null,
        storageKey,
        thumbnailKey,
        originalName: file.originalname,
        mimeType: 'image/jpeg',
        fileSize: processedBuffer.length,
        width: metadata.width,
        height: metadata.height,
        caption: dto.caption || null,
        takenAt: dto.takenAt ? new Date(dto.takenAt) : null,
        uploadedBy: userId,
      },
    });

    this.logger.log(
      `照片已上傳: id=${photo.id}, campaign=${dto.campaignId}, user=${userId}`,
    );

    return {
      ...photo,
      url: await this.storage.getSignedUrl(storageKey),
      thumbnailUrl: await this.storage.getSignedUrl(thumbnailKey),
    };
  }

  /**
   * 批次上傳照片（最多 20 張）
   */
  async uploadMultiple(
    files: Express.Multer.File[],
    dto: UploadPhotoDto,
    userId: string,
  ) {
    if (files.length > 20) {
      throw new BadRequestException('批次上傳最多 20 張照片');
    }

    const results = [];
    for (const file of files) {
      const result = await this.upload(file, dto, userId);
      results.push(result);
    }
    return results;
  }

  /**
   * 取得照片資訊（含簽名 URL）
   */
  async findById(id: string, userId: string) {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
      include: { album: true },
    });

    if (!photo) {
      throw new NotFoundException('照片不存在');
    }

    // OWASP A01: 驗證存取權限
    await this.campaignsService.checkCampaignAccess(photo.campaignId, userId);

    return {
      ...photo,
      url: await this.storage.getSignedUrl(photo.storageKey),
      thumbnailUrl: photo.thumbnailKey
        ? await this.storage.getSignedUrl(photo.thumbnailKey)
        : null,
    };
  }

  /**
   * 更新照片資訊（caption、sortOrder 等）
   */
  async update(id: string, dto: UpdatePhotoDto, userId: string) {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
    });

    if (!photo) {
      throw new NotFoundException('照片不存在');
    }

    // OWASP A01: 驗證 Campaign 存取權限（需 EDITOR+）
    await this.campaignsService.checkCampaignAccess(
      photo.campaignId,
      userId,
      ['ADMIN', 'EDITOR'] as any,
    );

    return this.prisma.photo.update({
      where: { id },
      data: {
        caption: dto.caption !== undefined ? dto.caption : undefined,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : undefined,
        takenAt: dto.takenAt ? new Date(dto.takenAt) : undefined,
      },
    });
  }

  /**
   * 刪除照片（含儲存服務的檔案）
   */
  async delete(id: string, userId: string) {
    const photo = await this.prisma.photo.findUnique({
      where: { id },
    });

    if (!photo) {
      throw new NotFoundException('照片不存在');
    }

    // OWASP A01: 驗證 Campaign 存取權限（需 EDITOR+）
    await this.campaignsService.checkCampaignAccess(
      photo.campaignId,
      userId,
      ['ADMIN', 'EDITOR'] as any,
    );

    // 如果是某相簿的封面，清除封面引用
    await this.prisma.album.updateMany({
      where: { coverPhotoId: id },
      data: { coverPhotoId: null },
    });

    // 刪除儲存檔案
    await Promise.all([
      this.storage.delete(photo.storageKey),
      photo.thumbnailKey ? this.storage.delete(photo.thumbnailKey) : Promise.resolve(),
    ]);

    // 刪除 DB 記錄
    await this.prisma.photo.delete({ where: { id } });

    this.logger.log(
      `照片已刪除: id=${id}, campaign=${photo.campaignId}, user=${userId}`,
    );

    return { success: true };
  }

  /**
   * 取得照片的公開 URL（公開相簿用，不需簽名）
   */
  getPublicUrl(storageKey: string): string {
    return this.storage.getPublicUrl(storageKey);
  }

  /**
   * 取得照片的簽名 URL
   */
  async getSignedUrl(storageKey: string): Promise<string> {
    return this.storage.getSignedUrl(storageKey);
  }

  // ==================== 私有方法 ====================

  /**
   * 壓縮並調整圖片尺寸
   */
  private async processImage(buffer: Buffer) {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    let pipeline = image.rotate(); // 自動修正 EXIF 方向

    // 如果超過最大尺寸，縮放
    if (
      (metadata.width && metadata.width > MAX_DIMENSION) ||
      (metadata.height && metadata.height > MAX_DIMENSION)
    ) {
      pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    const processedBuffer = await pipeline
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    // 取得處理後的實際尺寸
    const processedMeta = await sharp(processedBuffer).metadata();

    return {
      processedBuffer,
      metadata: {
        width: processedMeta.width || null,
        height: processedMeta.height || null,
      },
    };
  }

  /**
   * 生成縮圖
   */
  private async generateThumbnail(buffer: Buffer) {
    const thumbBuffer = await sharp(buffer)
      .rotate()
      .resize(THUMB_SIZE, THUMB_SIZE, {
        fit: 'cover',
        position: 'centre',
      })
      .jpeg({ quality: THUMB_QUALITY })
      .toBuffer();

    return { thumbBuffer };
  }
}
