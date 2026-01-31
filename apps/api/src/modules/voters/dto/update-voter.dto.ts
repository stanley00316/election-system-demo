import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateVoterDto } from './create-voter.dto';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVoterDto extends PartialType(
  OmitType(CreateVoterDto, ['campaignId'] as const),
) {
  @ApiPropertyOptional({ description: '影響力分數 (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  influenceScore?: number;
}
