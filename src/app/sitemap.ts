import type { MetadataRoute } from 'next';

/**
 * 11プロダクト共通 sitemap.xml 自動生成テンプレ。
 * SITE_URL を env から取り、主要パスを列挙する。各プロダクトで paths を編集。
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com';
  const now = new Date();
  const paths: string[] = ['/'];

  return paths.map((p) => ({
    url: `${base}${p}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: p === '/' ? 1 : 0.7,
  }));
}
