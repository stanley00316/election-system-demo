import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LineService } from './line.service';
import { GoogleService } from './google.service';
import { TokenBlacklistService } from './token-blacklist.service';
import { TotpService } from './totp.service';
import { TempTokenGuard } from './guards/temp-token.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          // OWASP A07: 縮短 access token 有效期至 30 分鐘
          expiresIn: configService.get('JWT_EXPIRES_IN', '30m'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LineService, GoogleService, TokenBlacklistService, TotpService, TempTokenGuard],
  exports: [AuthService, JwtModule, GoogleService, TokenBlacklistService, TotpService],
})
export class AuthModule {}
