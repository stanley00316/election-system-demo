import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { PhotosService } from './photos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UploadPhotoDto } from './dto/upload-photo.dto';
import { UpdatePhotoDto } from './dto/update-photo.dto';
import { ImageFileValidationPipe } from '../../common/pipes/file-validation.pipe';

@ApiTags('photos')
@Controller('photos')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PhotosController {
  constructor(private readonly photosService: PhotosService) {}

  @Post('upload')
  @ApiOperation({ summary: '上傳照片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        campaignId: { type: 'string' },
        albumId: { type: 'string' },
        voterId: { type: 'string' },
        caption: { type: 'string' },
        takenAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // OWASP: 10MB
    }),
  )
  async upload(
    @CurrentUser('id') userId: string,
    @UploadedFile(ImageFileValidationPipe()) file: Express.Multer.File,
    @Body() dto: UploadPhotoDto,
  ) {
    return this.photosService.upload(file, dto, userId);
  }

  @Post('upload-multiple')
  @ApiOperation({ summary: '批次上傳照片（最多 20 張）' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: { fileSize: 10 * 1024 * 1024 }, // OWASP: 10MB per file
    }),
  )
  async uploadMultiple(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadPhotoDto,
  ) {
    // 對每個檔案進行驗證
    const pipe = ImageFileValidationPipe();
    for (const file of files) {
      pipe.transform(file);
    }
    return this.photosService.uploadMultiple(files, dto, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '取得照片資訊' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.photosService.findById(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新照片資訊' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePhotoDto,
  ) {
    return this.photosService.update(id, dto, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除照片' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.photosService.delete(id, userId);
  }
}
