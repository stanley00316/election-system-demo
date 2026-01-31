import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;

    // 開始追蹤
    const transaction = Sentry.startTransaction({
      op: 'http.server',
      name: `${method} ${url}`,
    });

    // 設定使用者資訊
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.name,
      });
    }

    // 設定標籤
    Sentry.setTag('http.method', method);
    Sentry.setTag('http.url', url);

    return next.handle().pipe(
      tap(() => {
        transaction.setHttpStatus(200);
        transaction.finish();
      }),
      catchError((error) => {
        // 記錄錯誤到 Sentry
        Sentry.withScope((scope) => {
          scope.setExtra('request', {
            method,
            url,
            query: request.query,
            params: request.params,
            headers: this.filterHeaders(request.headers),
          });

          if (user) {
            scope.setUser({
              id: user.id,
              email: user.email,
            });
          }

          // 根據錯誤類型設定級別
          if (error instanceof HttpException) {
            const status = error.getStatus();

            // 4xx 錯誤設為 warning
            if (status >= 400 && status < 500) {
              scope.setLevel('warning');
              scope.setTag('error.type', 'client_error');
            } else {
              // 5xx 錯誤設為 error
              scope.setLevel('error');
              scope.setTag('error.type', 'server_error');
            }

            scope.setTag('http.status_code', status.toString());
            transaction.setHttpStatus(status);
          } else {
            // 未知錯誤
            scope.setLevel('error');
            scope.setTag('error.type', 'unknown');
            transaction.setHttpStatus(500);
          }

          Sentry.captureException(error);
        });

        transaction.finish();
        return throwError(() => error);
      }),
    );
  }

  /**
   * 過濾敏感的 headers
   */
  private filterHeaders(
    headers: Record<string, string>,
  ): Record<string, string> {
    const filtered = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'x-auth-token',
    ];

    for (const header of sensitiveHeaders) {
      if (filtered[header]) {
        filtered[header] = '[FILTERED]';
      }
    }

    return filtered;
  }
}
