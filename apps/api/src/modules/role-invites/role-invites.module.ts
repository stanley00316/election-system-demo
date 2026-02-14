import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoleInvitesController } from './role-invites.controller';
import { RoleInvitesService } from './role-invites.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    // OWASP A07: 透過 AdminAuthModule 匯入 Guards（含 TokenBlacklistService 依賴）
    AdminAuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '24h',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [RoleInvitesController],
  providers: [RoleInvitesService],
})
export class RoleInvitesModule {}
