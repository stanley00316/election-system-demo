import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 需要超級管理者權限的路徑
const SUPER_ADMIN_PATHS = [
  '/admin/promoters',
  '/admin/plans',
  '/admin/data-retention',
];

// 管理員公開路徑（無需認證）
const ADMIN_PUBLIC_PATHS = ['/admin/login'];

// 推廣者公開路徑（無需認證）
const PROMOTER_PUBLIC_PATHS = ['/promoter/login', '/promoter/register'];

function isSuperAdminPath(pathname: string): boolean {
  return SUPER_ADMIN_PATHS.some(
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

/**
 * 防目錄掃描：未認證的敏感路徑一律返回 404
 *
 * 原設計：無 token 時放行（200），依賴客戶端 Layout 重定向
 * → 掃描工具可透過 200 vs 404 差異探測 /admin/* 路徑是否存在
 *
 * 新設計：服務端直接攔截，無 token 或權限不足一律返回 404
 * → 掃描工具無法區分「存在但需認證」和「不存在」的路徑
 */
export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // ==================== ?ref=CODE 推廣追蹤 ====================
  const refCode = searchParams.get('ref');
  if (refCode && refCode.length >= 3 && refCode.length <= 32) {
    // 存入 cookie（30 天有效，前端可讀取）
    const cleanUrl = new URL(request.url);
    cleanUrl.searchParams.delete('ref');
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set('ref_code', refCode, {
      maxAge: 30 * 24 * 60 * 60, // 30 天
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  }

  // Demo 模式下放行
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  if (isDemoMode) {
    return NextResponse.next();
  }

  // 取得認證 token（cookie 或 header 皆可）
  const authCookie = request.cookies.get('token')?.value;
  const authHeader = request.headers.get('x-auth-token');
  const token = authCookie || authHeader;

  // ==================== /admin/* 路徑保護 ====================
  if (pathname.startsWith('/admin')) {
    // 公開頁面（login）放行
    if (ADMIN_PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.next();
    }

    // 無 token → 返回 404（不洩露路徑存在）
    if (!token) {
      return new NextResponse(null, { status: 404 });
    }

    const payload = decodeJwtPayload(token);

    // token 無效或非管理員 → 返回 404
    if (!payload || !payload.isAdmin) {
      return new NextResponse(null, { status: 404 });
    }

    // superAdmin 子路徑：管理員但非超管 → 重定向至 /admin（不對外暴露 404）
    if (isSuperAdminPath(pathname) && !payload.isSuperAdmin) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    return NextResponse.next();
  }

  // ==================== /promoter/* 路徑保護 ====================
  if (pathname.startsWith('/promoter')) {
    // 公開頁面（login/register）放行
    if (PROMOTER_PUBLIC_PATHS.includes(pathname)) {
      return NextResponse.next();
    }

    // 無 token → 返回 404
    if (!token) {
      return new NextResponse(null, { status: 404 });
    }

    const payload = decodeJwtPayload(token);

    // token 無效或非推廣者 → 返回 404
    if (!payload || !payload.isPromoter) {
      return new NextResponse(null, { status: 404 });
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 攔截所有頁面路由（排除靜態資源、API、_next）
    // 用於 ?ref=CODE 追蹤 + admin/promoter 路徑保護
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
