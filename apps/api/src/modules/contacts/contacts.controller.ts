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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactFilterDto } from './dto/contact-filter.dto';

@ApiTags('contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @ApiOperation({ summary: '建立接觸紀錄' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.contactsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '查詢接觸紀錄列表' })
  async findAll(
    @Query() filter: ContactFilterDto,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否為 campaign 成員
    if (filter.campaignId) {
      await this.contactsService.checkCampaignAccess(filter.campaignId, userId);
    }
    return this.contactsService.findAll(filter);
  }

  @Get('summary')
  @ApiOperation({ summary: '取得接觸紀錄統計' })
  async getSummary(
    @Query('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否為 campaign 成員
    await this.contactsService.checkCampaignAccess(campaignId, userId);
    return this.contactsService.getSummary(campaignId);
  }

  @Get('follow-ups')
  @ApiOperation({ summary: '取得待追蹤列表' })
  async getFollowUps(
    @Query('campaignId') campaignId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.contactsService.getFollowUps(campaignId, userId);
  }

  @Get('voter/:voterId')
  @ApiOperation({ summary: '取得選民的接觸紀錄' })
  async findByVoter(
    @Param('voterId') voterId: string,
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ) {
    // OWASP A01: 驗證使用者是否有權存取該選民所屬的 campaign
    await this.contactsService.checkVoterAccess(voterId, userId);
    return this.contactsService.findByVoter(voterId, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: '取得接觸紀錄詳情' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    // OWASP A01: 驗證使用者是否有權存取該接觸紀錄所屬的 campaign
    return this.contactsService.findByIdWithAccessCheck(id, userId);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新接觸紀錄' })
  async update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除接觸紀錄' })
  async delete(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.contactsService.delete(id, userId);
  }
}
