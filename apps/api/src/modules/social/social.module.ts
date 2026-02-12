import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { FacebookProvider } from './providers/facebook.provider';
import { LineProvider } from './providers/line.provider';
import { XTwitterProvider } from './providers/x-twitter.provider';
import { InstagramProvider } from './providers/instagram.provider';

@Module({
  providers: [
    SocialService,
    FacebookProvider,
    LineProvider,
    XTwitterProvider,
    InstagramProvider,
  ],
  exports: [SocialService],
})
export class SocialModule {}
