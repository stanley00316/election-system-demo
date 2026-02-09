import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RoleInvitesController } from './role-invites.controller';
import { RoleInvitesService } from './role-invites.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SuperAdminGuard } from '../admin-auth/guards/super-admin.guard';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
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
  providers: [RoleInvitesService, SuperAdminGuard],
})
export class RoleInvitesModule {}
