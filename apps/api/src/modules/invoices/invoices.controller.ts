import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InvoicesService, InvoiceData } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsOptional, IsString, IsEnum, IsUUID, MaxLength, Matches } from 'class-validator';

class IssueInvoiceDto {
  @IsUUID()
  paymentId: string;

  @IsEnum(['PERSONAL', 'COMPANY'])
  invoiceType: 'PERSONAL' | 'COMPANY';

  @IsOptional()
  @IsEnum(['PHONE', 'CERTIFICATE', 'ECPAY'])
  carrierType?: 'PHONE' | 'CERTIFICATE' | 'ECPAY';

  @IsOptional()
  @IsString()
  @MaxLength(64)
  carrierNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  @Matches(/^\d{8}$/, { message: '統一編號必須為 8 位數字' })
  companyTaxId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string;
}

@ApiTags('invoices')
@Controller('invoices')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post('issue')
  async issueInvoice(@Body() dto: IssueInvoiceDto) {
    return this.invoicesService.issueInvoice(dto.paymentId, {
      invoiceType: dto.invoiceType,
      carrierType: dto.carrierType,
      carrierNumber: dto.carrierNumber,
      companyTaxId: dto.companyTaxId,
      companyName: dto.companyName,
    });
  }

  @Get(':paymentId')
  async getInvoice(@Param('paymentId') paymentId: string) {
    return this.invoicesService.getInvoice(paymentId);
  }
}
