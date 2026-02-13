import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { FacebookProvider } from './providers/facebook.provider';
import { LineProvider } from './providers/line.provider';
import { XTwitterProvider } from './providers/x-twitter.provider';
import { InstagramProvider } from './providers/instagram.provider';
import { ThreadsProvider } from './providers/threads.provider';
import { TikTokProvider } from './providers/tiktok.provider';
import { YouTubeProvider } from './providers/youtube.provider';
import { TelegramProvider } from './providers/telegram.provider';
import { WhatsAppProvider } from './providers/whatsapp.provider';

@Module({
  providers: [
    SocialService,
    FacebookProvider,
    LineProvider,
    XTwitterProvider,
    InstagramProvider,
    ThreadsProvider,
    TikTokProvider,
    YouTubeProvider,
    TelegramProvider,
    WhatsAppProvider,
  ],
  exports: [SocialService],
})
export class SocialModule {}
