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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateVoterDto } from './dto/create-voter.dto';
import { UpdateVoterDto } from './dto/update-voter.dto';
import { VoterFilterDto } from './dto/voter-filter.dto';
import { CreateRelationshipDto, RecordMeetingDto, BatchCreateRelationshipsDto } from './dto/create-relationship.dto';

@ApiTags('voters')
@Controller('voters')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VotersController {
  constructor(
    private readonly votersService: VotersService,
    private readonly excelService: ExcelService,
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
  async findAll(@Query() filter: VoterFilterDto) {
    return this.votersService.findAll(filter);
  }

  @Get('nearby')
  @ApiOperation({ summary: '查詢附近選民' })
  async findNearby(
    @Query('campaignId') campaignId: string,
    @Query('latitude') latitude: number,
    @Query('longitude') longitude: number,
    @Query('radius') radius?: number,
    @Query('limit') limit?: number,
  ) {
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
    @Query('lineId') lineId?: string,
    @Query('lineUrl') lineUrl?: string,
  ) {
    return this.votersService.searchByLine(campaignId, lineId, lineUrl);
  }

  @Get('duplicates')
  @ApiOperation({ summary: '查詢重複選民' })
  async findDuplicates(@Query('campaignId') campaignId: string) {
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
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
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
  async findById(@Param('id') id: string) {
    return this.votersService.findById(id);
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
  async getRelationships(@Param('id') id: string) {
    return this.votersService.getRelationships(id);
  }

  @Post('relationships')
  @ApiOperation({ summary: '建立選民關係' })
  async createRelationship(@Body() dto: CreateRelationshipDto) {
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
  async getRelationshipsByEvent(@Param('eventId') eventId: string) {
    return this.votersService.getRelationshipsByEvent(eventId);
  }

  @Get('relationships/:relationshipId/meetings')
  @ApiOperation({ summary: '取得關係的見面紀錄' })
  async getRelationshipMeetings(@Param('relationshipId') relationshipId: string) {
    return this.votersService.getRelationshipMeetings(relationshipId);
  }

  @Delete('relationships/:relationshipId')
  @ApiOperation({ summary: '刪除選民關係' })
  async deleteRelationship(@Param('relationshipId') relationshipId: string) {
    return this.votersService.deleteRelationship(relationshipId);
  }
}
