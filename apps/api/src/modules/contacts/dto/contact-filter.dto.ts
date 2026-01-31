import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ContactType, ContactOutcome } from '@prisma/client';

export class ContactFilterDto {
  @ApiProperty({ description: '選舉活動 ID' })
  @IsString()
  campaignId: string;

  @ApiPropertyOptional({ description: '選民 ID' })
  @IsString()
  @IsOptional()
  voterId?: string;

  @ApiPropertyOptional({ description: '使用者 ID' })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ description: '接觸類型', type: [String], enum: ContactType })
  @IsArray()
  @IsEnum(ContactType, { each: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  type?: ContactType[];

  @ApiPropertyOptional({ description: '接觸結果', type: [String], enum: ContactOutcome })
  @IsArray()
  @IsEnum(ContactOutcome, { each: true })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  outcome?: ContactOutcome[];

  @ApiPropertyOptional({ description: '開始日期' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '結束日期' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: '頁碼', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每頁數量', default: 20 })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({ description: '排序欄位', enum: ['contactDate', 'createdAt'] })
  @IsString()
  @IsOptional()
  sortBy?: 'contactDate' | 'createdAt';

  @ApiPropertyOptional({ description: '排序方向', enum: ['asc', 'desc'] })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
