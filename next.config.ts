import type { NextConfig } from "next";

// =============================================================================
// 本名検査は L6 (package.json prebuild) + L7 (deploy-guard Phase 0) +
// L8 (vercel.json buildCommand) + L3/L4 (git hooks) で多重カバー。
// next.config.ts での webpack hook は Turbopack と競合するため使わない。
// =============================================================================

const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://vercel.live",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: ContentSecurityPolicy },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // imapflow は Node.js 専用（TLS sockets 利用）。Next.js のサーバー bundler が
  // 巻き込むと初期化失敗で 'Command failed' を返すため外部化必須。
  serverExternalPackages: ['imapflow', 'nodemailer'],
  experimental: {
    typedRoutes: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
