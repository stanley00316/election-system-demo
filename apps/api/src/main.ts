import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import * as path from 'path';
import { AppModule } from './app.module';
import { SentryInterceptor, SentryExceptionFilter } from './modules/sentry';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());

  // CORS — OWASP A05: 僅允許環境變數指定的來源，生產環境不包含硬編碼 localhost
  const corsOrigin = configService.get('CORS_ORIGIN', 'http://localhost:3000');
  const isProduction = configService.get('NODE_ENV') === 'production';
  const allowedOrigins = corsOrigin.includes(',')
    ? corsOrigin.split(',').map((o: string) => o.trim())
    : [corsOrigin];

  // 開發環境額外允許 localhost 變體
  if (!isProduction) {
    const devOrigins = ['http://localhost:3000', 'http://localhost:3002'];
    devOrigins.forEach((o) => {
      if (!allowedOrigins.includes(o)) allowedOrigins.push(o);
    });
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global prefix
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Sentry Error Monitoring (全域例外過濾器和攔截器)
  if (configService.get('SENTRY_DSN')) {
    app.useGlobalInterceptors(new SentryInterceptor());
    app.useGlobalFilters(new SentryExceptionFilter());
  }

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger API Documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('選情系統 API')
      .setDescription('選情分析與選民關係管理系統 API 文件')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', '身分驗證')
      .addTag('users', '使用者管理')
      .addTag('campaigns', '選舉活動')
      .addTag('voters', '選民管理')
      .addTag('contacts', '接觸紀錄')
      .addTag('events', '活動管理')
      .addTag('schedules', '行程規劃')
      .addTag('analysis', '選情分析')
      .addTag('maps', '地圖服務')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // 本地檔案上傳靜態路由（開發環境用）
  const storageProvider = configService.get('STORAGE_PROVIDER', 'local');
  if (storageProvider === 'local') {
    const uploadPath = configService.get('UPLOAD_PATH', './uploads');
    app.useStaticAssets(path.resolve(uploadPath), { prefix: '/uploads' });
  }

  const port = configService.get('PORT', 3001);
  await app.listen(port);
  
  console.log(`🚀 選情系統 API 啟動於 http://localhost:${port}/${apiPrefix}`);
  console.log(`📚 API 文件位於 http://localhost:${port}/docs`);
}

bootstrap();
