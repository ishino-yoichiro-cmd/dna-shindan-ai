/**
 * POST /api/geocode — 出生地テキストを緯度経度に変換（サーバーサイド）
 *
 * Nominatim は User-Agent が必要なため、クライアント直叩きは規約違反かつ失敗リスクが高い。
 * サーバー経由で適切な User-Agent を付与して呼び出す。
 *
 * body: { city: string; prefecture: string }
 * response: { lat: number; lng: number; displayName: string } | { error: string }
 */

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.prefecture !== 'string') {
      return Response.json({ error: '都道府県が指定されていません。' }, { status: 400 });
    }

    const prefecture: string = body.prefecture.trim();
    const rawCity: string = typeof body.city === 'string' ? body.city.trim() : '';

    // 市区町村名の正規化: 短い名前（漢字1〜2文字）や末尾に行政区分がない場合は「市」を補完
    const normalizeCity = (city: string): string => {
      if (!city) return city;
      // すでに市/区/町/村/郡/島/谷/浜/崎で終わっていれば補完不要
      if (/[市区町村郡島谷浜崎都府道]$/.test(city)) return city;
      // 2文字以下かつ漢字のみなら「市」を補完（例: 津→津市、堺→堺市）
      if (/^[一-鿿]{1,3}$/.test(city)) return city + '市';
      return city;
    };

    const city = normalizeCity(rawCity);
    const queryParts = city ? [city, prefecture, 'Japan'] : [prefecture, 'Japan'];
    const q = encodeURIComponent(queryParts.join(', '));

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&accept-language=ja`;

    const res = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': 'DNA-Shindan-AI/1.0 (contact: yoisno@gmail.com)',
        'Accept': 'application/json',
        'Accept-Language': 'ja',
      },
    });

    if (!res.ok) {
      return Response.json({ error: 'ジオコーディングサービスへの接続に失敗しました。' }, { status: 502 });
    }

    const data: Array<{ lat: string; lon: string; display_name: string }> = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      // 市名付きで失敗した場合、都道府県だけで再試行
      if (city) {
        const q2 = encodeURIComponent(`${prefecture}, Japan`);
        const res2 = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${q2}&format=json&limit=1`,
          {
            headers: {
              'User-Agent': 'DNA-Shindan-AI/1.0 (contact: yoisno@gmail.com)',
              'Accept': 'application/json',
            },
          },
        );
        const data2: Array<{ lat: string; lon: string; display_name: string }> = res2.ok
          ? await res2.json()
          : [];
        if (Array.isArray(data2) && data2.length > 0) {
          return Response.json({
            lat: parseFloat(data2[0].lat),
            lng: parseFloat(data2[0].lon),
            displayName: data2[0].display_name,
            fallback: true, // 都道府県レベルにフォールバックしたことを示す
          });
        }
      }
      return Response.json({ error: '見つかりませんでした。都道府県だけ選択するか「出生地は不明」をご使用ください。' }, { status: 404 });
    }

    return Response.json({
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
      fallback: false,
    });
  } catch (e) {
    console.error('[geocode]', e);
    return Response.json({ error: 'サーバーエラーが発生しました。' }, { status: 500 });
  }
}
