import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: '取得個人資料' })
  async getProfile(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Put('profile')
  @ApiOperation({ summary: '更新個人資料' })
  async updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(userId, dto);
  }

  @Get('campaigns')
  @ApiOperation({ summary: '取得使用者的選舉活動' })
  async getUserCampaigns(@CurrentUser('id') userId: string) {
    return this.usersService.getUserCampaigns(userId);
  }

  @Get('activity-logs')
  @ApiOperation({ summary: '取得操作紀錄' })
  async getActivityLogs(
    @CurrentUser('id') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.usersService.getActivityLogs(userId, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: '取得使用者資料' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('id') currentUserId: string,
  ) {
    // OWASP A01: 限制使用者只能查看自己的資料
    if (id !== currentUserId) {
      throw new ForbiddenException('您只能查看自己的資料');
    }
    return this.usersService.findById(id);
  }
}
