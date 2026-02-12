import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { VotersService } from './voters.service';
import { ExcelService } from './excel.service';
import { PhotosService } from '../photos/photos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateVoterDto } from './dto/create-voter.dto';
import { UpdateVoterDto } from './dto/update-voter.dto';
import { VoterFilterDto } from './dto/voter-filter.dto';
import { CreateRelationshipDto, RecordMeetingDto, BatchCreateRelationshipsDto } from './dto/create-relationship.dto';
import { ExcelFileValidationPipe, ImageFileValidationPipe } from '../../common/pipes/file-validation.pipe';

@ApiTags('voters')
@Controller('voters')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VotersController {
  constructor(
    private readonly votersService: VotersService,
    private readonly excelService: ExcelService,
    private readonly photosService: PhotosService,
  ) {}

  @Post()
  @ApiOperation({ summary: '建立選民' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVoterDto,
  ) {
    return this.votersService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '查詢選民列表' })
  async findAll(
    @Query() filter: VoterFilterDto,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否為 campaign 成員
    if (filter.campaignId) {
      await this.votersService.checkCampaignAccess(filter.campaignId, userId);
    }
    return this.votersService.findAll(filter);
  }

  @Get('nearby')
  @ApiOperation({ summary: '查詢附近選民' })
  async findNearby(
    @Query('campaignId') campaignId: string,
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @CurrentUser('id') userId: string,
    @Query('radius') radius?: number,
    @Query('limit') limit?: number,
  ) {
    // OWASP A01: 驗證使用者是否為 campaign 成員
    await this.votersService.checkCampaignAccess(campaignId, userId);
    return this.votersService.findNearby(
      campaignId,
      latitude,
      longitude,
      radius,
      limit,
    );
  }

  @Get('search-by-line')
  @ApiOperation({ summary: '根據 LINE ID 或 URL 搜尋選民' })
  async searchByLine(
    @Query('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
    @Query('lineId') lineId?: string,
    @Query('lineUrl') lineUrl?: string,
  ) {
    // OWASP A01: 驗證使用者是否為 campaign 成員
    await this.votersService.checkCampaignAccess(campaignId, userId);
    return this.votersService.searchByLine(campaignId, lineId, lineUrl);
  }

  @Get('duplicates')
  @ApiOperation({ summary: '查詢重複選民' })
  async findDuplicates(
    @Query('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否為 campaign 成員
    await this.votersService.checkCampaignAccess(campaignId, userId);
    return this.votersService.findDuplicates(campaignId);
  }

  @Post('import')
  @ApiOperation({ summary: '匯入選民 Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        campaignId: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // OWASP: Multer 層級檔案大小限制 10MB
    },
  }))
  async importExcel(
    @CurrentUser('id') userId: string,
    @UploadedFile(ExcelFileValidationPipe()) file: Express.Multer.File,
    @Body('campaignId') campaignId: string,
  ) {
    return this.excelService.importVoters(file, campaignId, userId);
  }

  @Get('export')
  @ApiOperation({ summary: '匯出選民 Excel' })
  async exportExcel(
    @Query('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.excelService.exportVoters(campaignId, userId);
  }

  @Post('merge')
  @ApiOperation({ summary: '合併重複選民' })
  async mergeVoters(
    @Body('primaryId') primaryId: string,
    @Body('secondaryId') secondaryId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.votersService.mergeVoters(primaryId, secondaryId, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: '取得選民詳情' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否有權存取該選民所屬的 campaign
    return this.votersService.findByIdWithAccessCheck(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新選民' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateVoterDto,
  ) {
    return this.votersService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除選民' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.votersService.delete(id, userId);
  }

  @Get(':id/relationships')
  @ApiOperation({ summary: '取得選民關係' })
  async getRelationships(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否有權存取該選民所屬的 campaign
    await this.votersService.checkVoterAccess(id, userId);
    return this.votersService.getRelationships(id);
  }

  @Post('relationships')
  @ApiOperation({ summary: '建立選民關係' })
  async createRelationship(
    @Body() dto: CreateRelationshipDto,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否有權存取來源選民所屬的 campaign
    await this.votersService.checkVoterAccess(dto.sourceVoterId, userId);
    return this.votersService.createRelationship(dto);
  }

  @Post('relationships/meeting')
  @ApiOperation({ summary: '記錄見面（若關係不存在則自動建立）' })
  async recordMeeting(
    @Body() dto: RecordMeetingDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.votersService.recordMeeting(dto, userId);
  }

  @Post('relationships/batch')
  @ApiOperation({ summary: '批量建立關係' })
  async batchCreateRelationships(
    @Body() dto: BatchCreateRelationshipsDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.votersService.batchCreateRelationships(dto, userId);
  }

  @Get('relationships/by-event/:eventId')
  @ApiOperation({ summary: '取得活動中發現的關係' })
  async getRelationshipsByEvent(
    @Param('eventId') eventId: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否有權存取該活動所屬的 campaign
    await this.votersService.checkEventAccess(eventId, userId);
    return this.votersService.getRelationshipsByEvent(eventId);
  }

  @Get('relationships/:relationshipId/meetings')
  @ApiOperation({ summary: '取得關係的見面紀錄' })
  async getRelationshipMeetings(
    @Param('relationshipId') relationshipId: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否有權存取該關係所屬的 campaign
    await this.votersService.checkRelationshipAccess(relationshipId, userId);
    return this.votersService.getRelationshipMeetings(relationshipId);
  }

  @Delete('relationships/:relationshipId')
  @ApiOperation({ summary: '刪除選民關係' })
  async deleteRelationship(
    @Param('relationshipId') relationshipId: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否有權存取該關係所屬的 campaign
    await this.votersService.checkRelationshipAccess(relationshipId, userId);
    return this.votersService.deleteRelationship(relationshipId);
  }

  // ==================== 選民辨識照 ====================

  @Post(':id/avatar')
  @ApiOperation({ summary: '上傳選民辨識照' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 },
  }))
  async uploadAvatar(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @UploadedFile(ImageFileValidationPipe()) file: Express.Multer.File,
  ) {
    return this.votersService.uploadAvatar(id, file, userId);
  }

  @Delete(':id/avatar')
  @ApiOperation({ summary: '移除選民辨識照' })
  async deleteAvatar(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.votersService.deleteAvatar(id, userId);
  }
}
