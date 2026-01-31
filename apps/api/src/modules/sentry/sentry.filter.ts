import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

/**
 * 全域例外過濾器
 * 捕捉所有未處理的例外並記錄到 Sentry
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let errorResponse: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        errorResponse = exceptionResponse;
        message =
          (exceptionResponse as any).message || exception.message;
      } else {
        message = exceptionResponse as string;
        errorResponse = { message };
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message || '內部伺服器錯誤';
      errorResponse = {
        statusCode: status,
        message: '內部伺服器錯誤',
        error: 'Internal Server Error',
      };

      // 記錄未知錯誤到 Sentry
      this.captureException(exception, request);
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = '未知錯誤';
      errorResponse = {
        statusCode: status,
        message,
        error: 'Unknown Error',
      };

      // 記錄未知錯誤到 Sentry
      this.captureException(new Error(String(exception)), request);
    }

    // 記錄錯誤日誌
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // 回傳錯誤回應
    response.status(status).json({
      ...errorResponse,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }

  /**
   * 捕捉例外到 Sentry
   */
  private captureException(error: Error, request: Request) {
    Sentry.withScope((scope) => {
      // 設定請求資訊
      scope.setExtra('request', {
        method: request.method,
        url: request.url,
        query: request.query,
        params: request.params,
        ip: request.ip,
        userAgent: request.get('user-agent'),
      });

      // 設定使用者資訊（如果有的話）
      if ((request as any).user) {
        const user = (request as any).user;
        scope.setUser({
          id: user.id,
          email: user.email,
          username: user.name,
        });
      }

      // 設定標籤
      scope.setTag('environment', process.env.NODE_ENV || 'development');
      scope.setTag('http.method', request.method);
      scope.setTag('http.url', request.url);

      // 捕捉例外
      Sentry.captureException(error);
    });
  }
}
