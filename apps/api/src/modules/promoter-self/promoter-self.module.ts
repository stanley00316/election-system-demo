import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PromoterSelfController } from './promoter-self.controller';
import { PromoterSelfService } from './promoter-self.service';
import { PromoterGuard } from './guards/promoter.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PromoterSelfController],
  providers: [PromoterSelfService, PromoterGuard],
  exports: [PromoterSelfService],
})
export class PromoterSelfModule {}
