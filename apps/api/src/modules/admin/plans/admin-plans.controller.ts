import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AdminPlansService } from './admin-plans.service';
import { SuperAdminGuard } from '../../admin-auth/guards/super-admin.guard';
import { AdminGuard } from '../../admin-auth/guards/admin.guard';
import { CreatePlanDto, UpdatePlanDto } from './dto/update-plan.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('admin/plans')
@ApiBearerAuth()
export class AdminPlansController {
  constructor(private readonly adminPlansService: AdminPlansService) {}

  /**
   * 取得所有方案（一般管理員可查看）
   */
  @Get()
  @UseGuards(AdminGuard)
  async getAllPlans() {
    return this.adminPlansService.getAllPlans();
  }

  /**
   * 取得方案統計（一般管理員可查看）
   */
  @Get('stats')
  @UseGuards(AdminGuard)
  async getPlanStats() {
    return this.adminPlansService.getPlanStats();
  }

  /**
   * 取得單一方案（一般管理員可查看）
   */
  @Get(':id')
  @UseGuards(AdminGuard)
  async getPlan(@Param('id') id: string) {
    return this.adminPlansService.getPlan(id);
  }

  /**
   * 建立新方案（僅超級管理者）
   */
  @Post()
  @UseGuards(SuperAdminGuard)
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.adminPlansService.createPlan(dto);
  }

  /**
   * 更新方案（僅超級管理者）
   */
  @Put(':id')
  @UseGuards(SuperAdminGuard)
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.adminPlansService.updatePlan(id, dto);
  }

  /**
   * 停用方案（僅超級管理者）
   */
  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  async deactivatePlan(@Param('id') id: string) {
    return this.adminPlansService.deactivatePlan(id);
  }
}
