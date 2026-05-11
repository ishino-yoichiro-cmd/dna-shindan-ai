/**
 * 11プロダクト共通 Next.js セキュリティヘッダ設定。
 * 既存の next.config.{ts,mjs,js} に以下のように merge する：
 *
 *   import { securityHeaders } from './next.config.security';
 *   const nextConfig = {
 *     async headers() { return [{ source: '/(.*)', headers: securityHeaders }]; }
 *   };
 *
 * 準拠：OWASP A05/V3・shieldfy API Security・Frontend Checklist
 */
export const securityHeaders = [
  // HSTS (TLS強制)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // クリックジャック防止
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // MIME sniff 防止
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Referrer 漏洩制限
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // 強力な機能制限
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // CSP（最小・必要に応じて緩和）
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://*.vercel-insights.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
  // X-XSS-Protection（古いブラウザ向け・現代ブラウザでは CSP が有効）
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
];
