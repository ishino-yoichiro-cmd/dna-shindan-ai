# Security Headers 統合 TODO

このファイルは secretary-harness が自動配置した。
次の作業を **次の Claude Code セッションで自動適用** する：

```
secretary-harness apply security-headers next.config.ts
```

または手動で以下を反映する：

## 手順

### 1. `next.config.ts` の冒頭に import を追加

```ts
import { securityHeaders } from './next.config.security';
```

### 2. config オブジェクトに `headers()` を追加

```ts
const nextConfig = {
  /* 既存設定 */

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

## 検証

完了後：

```
npm run build && npm run start
curl -I http://localhost:3000 | grep -E "Strict-Transport|X-Frame-Options|Content-Security-Policy"
```

すべてのヘッダが返れば OK。

完了したらこの `SECURITY_HEADERS_TODO.md` を削除すること。
