import { Module } from '@nestjs/common';
import { AlbumsController, PublicAlbumsController } from './albums.controller';
import { AlbumsService } from './albums.service';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { PhotosModule } from '../photos/photos.module';
import { SocialModule } from '../social';

@Module({
  imports: [CampaignsModule, PhotosModule, SocialModule],
  controllers: [AlbumsController, PublicAlbumsController],
  providers: [AlbumsService],
  exports: [AlbumsService],
})
export class AlbumsModule {}
