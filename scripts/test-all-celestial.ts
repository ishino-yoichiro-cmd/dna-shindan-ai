// 動作確認スクリプト：runAllCelestial の全結果を JSON 出力
import { runAllCelestial } from '../src/lib/celestial';
import type { CelestialInput } from '../src/lib/celestial';

async function main() {
  const sample: CelestialInput = {
    fullName: '山田太郎',
    birthDate: '1985-05-15',
    birthTime: '14:30',
    birthPlace: {
      latitude: 35.6762,
      longitude: 139.6503,
      timezone: 'Asia/Tokyo',
    },
    gender: 'male',
  };

  const result = await runAllCelestial(sample);
  process.stdout.write(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
