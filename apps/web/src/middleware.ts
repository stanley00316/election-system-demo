import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要超級管理者權限的路徑
const SUPER_ADMIN_PATHS = [
  '/admin/promoters',
  '/admin/plans',
  '/admin/data-retention',
];

// 需要推廣者身份的路徑
const PROMOTER_PATHS = [
  '/promoter/dashboard',
  '/promoter/referrals',
  '/promoter/share-links',
  '/promoter/trials',
];

function isSuperAdminPath(pathname: string): boolean {
  return SUPER_ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
}

function isPromoterPath(pathname: string): boolean {
  return PROMOTER_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
}

/**
 * 從 JWT token 中解析 payload（不驗證簽名，僅解碼）
 * 實際驗證由後端 API 負責，此處僅做前端路由攔截
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Demo 模式下放行
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  if (isDemoMode) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('token')?.value;

  // 處理超級管理者路徑
  if (isSuperAdminPath(pathname)) {
    if (!authCookie) {
      // 沒有 cookie token，依靠客戶端 Guard 做檢查
      return NextResponse.next();
    }

    const payload = decodeJwtPayload(authCookie);
    if (!payload || !payload.isSuperAdmin) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.next();
  }

  // 處理推廣者路徑
  if (isPromoterPath(pathname)) {
    if (!authCookie) {
      // 沒有 cookie token，依靠客戶端 Layout 做檢查
      return NextResponse.next();
    }

    const payload = decodeJwtPayload(authCookie);
    if (!payload || !payload.isPromoter) {
      return NextResponse.redirect(new URL('/role-select', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/promoters/:path*',
    '/admin/plans/:path*',
    '/admin/data-retention/:path*',
    '/promoter/dashboard/:path*',
    '/promoter/referrals/:path*',
    '/promoter/share-links/:path*',
    '/promoter/trials/:path*',
  ],
};
