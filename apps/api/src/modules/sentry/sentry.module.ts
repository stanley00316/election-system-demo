import { Module, Global, DynamicModule, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

@Global()
@Module({})
export class SentryModule implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  static forRoot(): DynamicModule {
    return {
      module: SentryModule,
      imports: [ConfigModule],
      providers: [
        {
          provide: 'SENTRY_OPTIONS',
          useFactory: (configService: ConfigService) => ({
            dsn: configService.get<string>('SENTRY_DSN'),
            environment: configService.get<string>('NODE_ENV', 'development'),
            release: configService.get<string>('APP_VERSION', '1.0.0'),
            tracesSampleRate: configService.get<number>(
              'SENTRY_TRACES_SAMPLE_RATE',
              0.1,
            ),
            profilesSampleRate: configService.get<number>(
              'SENTRY_PROFILES_SAMPLE_RATE',
              0.1,
            ),
          }),
          inject: [ConfigService],
        },
      ],
      exports: ['SENTRY_OPTIONS'],
    };
  }

  onModuleInit() {
    const dsn = this.configService.get<string>('SENTRY_DSN');

    // 只有在有設定 DSN 時才初始化 Sentry
    if (dsn) {
      // 準備 integrations
      const integrations = [
        // 自動偵測 HTTP 請求
        new Sentry.Integrations.Http({ tracing: true }),
      ];

      Sentry.init({
        dsn,
        environment: this.configService.get<string>('NODE_ENV', 'development'),
        release: `election-system@${this.configService.get<string>('APP_VERSION', '1.0.0')}`,

        // 效能監控
        tracesSampleRate: this.configService.get<number>(
          'SENTRY_TRACES_SAMPLE_RATE',
          0.1,
        ),

        // Profiling
        profilesSampleRate: this.configService.get<number>(
          'SENTRY_PROFILES_SAMPLE_RATE',
          0.1,
        ),

        integrations: integrations as any,

        // 忽略特定錯誤
        ignoreErrors: [
          // 常見的非關鍵錯誤
          'ECONNRESET',
          'ECONNREFUSED',
          'ETIMEDOUT',
          // 健康檢查相關
          'HealthCheckError',
        ],

        // 在發送前過濾敏感資訊
        beforeSend(event) {
          // 移除敏感的 header
          if (event.request?.headers) {
            delete event.request.headers['authorization'];
            delete event.request.headers['cookie'];
          }

          // 移除敏感的 body 資料
          if (event.request?.data) {
            const sensitiveFields = [
              'password',
              'token',
              'secret',
              'apiKey',
              'lineChannelSecret',
            ];
            for (const field of sensitiveFields) {
              if (event.request.data[field]) {
                event.request.data[field] = '[FILTERED]';
              }
            }
          }

          return event;
        },
      });

      console.log('🔍 Sentry 錯誤監控已啟用');
    } else {
      console.log('⚠️ Sentry DSN 未設定，錯誤監控已停用');
    }
  }
}
