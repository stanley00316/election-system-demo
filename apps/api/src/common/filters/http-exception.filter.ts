import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * OWASP A05: 全域 fallback 例外過濾器
 * 確保即使 Sentry 未設定，也不會洩露堆疊追蹤或內部錯誤細節
 *
 * 防目錄掃描：
 * - 無 Bearer token 的 401 回應偽裝為 404，使攻擊者無法透過 401 vs 404 差異枚舉受保護端點
 * - 移除回應中的 path 欄位，防止路徑枚舉輔助
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '伺服器內部錯誤';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as Record<string, any>;
        message = resp.message || message;
        error = resp.error || error;
      }
    } else {
      // 非 HttpException：記錄完整錯誤但不暴露給客戶端
      this.logger.error(
        `Unhandled exception: ${exception instanceof Error ? exception.message : 'Unknown error'}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    // 防目錄掃描：無 Bearer token 的 401 回應偽裝為 404
    // 使攻擊者無法透過狀態碼差異（401 vs 404）枚舉受保護的 API 端點
    if (status === HttpStatus.UNAUTHORIZED) {
      const authHeader = request.headers?.authorization;
      if (!authHeader) {
        status = HttpStatus.NOT_FOUND;
        message = 'Not Found';
        error = 'Not Found';
      }
    }

    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      // 防目錄掃描：移除 path 欄位，不向客戶端回傳請求路徑
    });
  }
}
