import { Module, forwardRef } from '@nestjs/common';
import { VotersController } from './voters.controller';
import { VotersService } from './voters.service';
import { ExcelService } from './excel.service';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { MapsModule } from '../maps/maps.module';
import { PhotosModule } from '../photos/photos.module';

@Module({
  imports: [CampaignsModule, MapsModule, forwardRef(() => PhotosModule)],
  controllers: [VotersController],
  providers: [VotersService, ExcelService],
  exports: [VotersService],
})
export class VotersModule {}
