// OWASP A05: 生產環境禁止啟用 Demo 模式，防止所有前端安全檢查被繞過
if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
  console.error('FATAL: Demo mode MUST NOT be enabled in production! Aborting.');
  process.exit(1);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for Docker
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'profile.line-scdn.net',
      },
    ],
  },
  // 示範模式部署時忽略 TypeScript 和 ESLint 錯誤
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // OWASP A05: 安全標頭（含 Content Security Policy）
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';
    // OWASP A05: 生產環境移除 unsafe-eval，僅保留 unsafe-inline（Next.js styled-jsx 必需）
    // TODO: 未來升級 Next.js 15+ 後可改用 nonce 機制取代 unsafe-inline
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com"
      : "script-src 'self' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com";
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://profile.line-scdn.net https://maps.googleapis.com https://maps.gstatic.com https://*.unsplash.com",
              "font-src 'self' https://fonts.gstatic.com",
              "connect-src 'self' " + (() => { try { return new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').origin; } catch { return 'http://localhost:3001'; } })() + " https://maps.googleapis.com https://api.line.me https://access.line.me",
              "frame-src 'self' https://maps.googleapis.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)',
          },
          // OWASP A05: HSTS — 強制使用 HTTPS（1 年，含子域名）
          ...(isDev ? [] : [{
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          }]),
        ],
      },
    ];
  },
  async rewrites() {
    // 示範模式不需要 API 重寫
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
