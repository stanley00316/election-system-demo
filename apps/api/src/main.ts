import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SentryInterceptor, SentryExceptionFilter } from './modules/sentry';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());

  // CORS
  const corsOrigin = configService.get('CORS_ORIGIN', 'http://localhost:3000');
  app.enableCors({
    origin: corsOrigin.includes(',')
      ? corsOrigin.split(',').map((o: string) => o.trim())
      : [corsOrigin, 'http://localhost:3002'],
    credentials: true,
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

  const port = configService.get('PORT', 3001);
  await app.listen(port);
  
  console.log(`🚀 選情系統 API 啟動於 http://localhost:${port}/${apiPrefix}`);
  console.log(`📚 API 文件位於 http://localhost:${port}/docs`);
}

bootstrap();
