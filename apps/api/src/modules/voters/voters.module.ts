import { Module } from '@nestjs/common';
import { VotersController } from './voters.controller';
import { VotersService } from './voters.service';
import { ExcelService } from './excel.service';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { MapsModule } from '../maps/maps.module';

@Module({
  imports: [CampaignsModule, MapsModule],
  controllers: [VotersController],
  providers: [VotersService, ExcelService],
  exports: [VotersService],
})
export class VotersModule {}
