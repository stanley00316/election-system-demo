import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { AlbumsService } from './albums.service';
import { PhotosService } from '../photos/photos.service';
import { SocialService } from '../social/social.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { AlbumFilterDto } from './dto/album-filter.dto';
import { ShareSocialDto } from './dto/share-social.dto';
import { ImageFileValidationPipe } from '../../common/pipes/file-validation.pipe';

@ApiTags('albums')
@Controller('albums')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AlbumsController {
  constructor(
    private readonly albumsService: AlbumsService,
    private readonly photosService: PhotosService,
    private readonly socialService: SocialService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: '建立相簿' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAlbumDto,
  ) {
    return this.albumsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: '列出相簿' })
  async findAll(
    @Query() filter: AlbumFilterDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.albumsService.findAll(filter, userId);
  }

  @Get('social/status')
  @ApiOperation({ summary: '取得社群平台設定狀態' })
  async getSocialStatus(
    @CurrentUser('id') _userId: string, // OWASP A01: 確保已認證
  ) {
    return this.socialService.getConfiguredPlatforms();
  }

  @Get(':id')
  @ApiOperation({ summary: '相簿詳情（含照片）' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.albumsService.findById(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新相簿' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAlbumDto,
  ) {
    return this.albumsService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除相簿' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.albumsService.delete(id, userId);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: '發表相簿' })
  async publish(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.albumsService.publish(id, userId);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: '取消發表' })
  async unpublish(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.albumsService.unpublish(id, userId);
  }

  @Patch(':id/cover')
  @ApiOperation({ summary: '設定封面照片' })
  async setCoverPhoto(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('photoId') photoId: string,
  ) {
    return this.albumsService.setCoverPhoto(id, photoId, userId);
  }

  @Post(':id/photos')
  @ApiOperation({ summary: '上傳照片到相簿' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadPhotos(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('caption') caption?: string,
  ) {
    // 驗證每個檔案
    const pipe = ImageFileValidationPipe();
    for (const file of files) {
      pipe.transform(file);
    }

    // 取得相簿以獲取 campaignId
    const album = await this.albumsService.findById(id, userId);

    return this.photosService.uploadMultiple(
      files,
      {
        campaignId: album.campaignId,
        albumId: id,
        caption,
      },
      userId,
    );
  }

  @Patch(':id/photos/reorder')
  @ApiOperation({ summary: '重新排序照片' })
  async reorderPhotos(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body('photoIds') photoIds: string[],
  ) {
    return this.albumsService.reorderPhotos(id, photoIds, userId);
  }

  @Post(':id/share-social')
  @ApiOperation({ summary: '發佈相簿到社群平台' })
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 每分鐘最多 5 次
  async shareSocial(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ShareSocialDto,
  ) {
    // OWASP A05: 使用 ConfigService 取得設定，不硬編碼 URL
    const siteUrl =
      this.configService.get<string>('SITE_URL') ||
      this.configService.get<string>('CORS_ORIGIN', 'https://localhost:3000');

    const shareData = await this.albumsService.getShareData(
      id,
      userId,
      siteUrl,
    );

    return this.socialService.publishToSocial(
      dto.platforms,
      shareData,
      dto.message,
    );
  }
}

/**
 * 公開相簿控制器（不需登入）
 */
@ApiTags('public-albums')
@Controller('public/albums')
export class PublicAlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @Get(':slug')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // OWASP A07: Rate limiting
  @ApiOperation({ summary: '取得公開相簿' })
  async findBySlug(@Param('slug') slug: string) {
    return this.albumsService.findPublicBySlug(slug);
  }
}
