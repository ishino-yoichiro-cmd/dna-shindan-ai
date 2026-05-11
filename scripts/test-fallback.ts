// フォールバック検証：時刻なし・出生地なし・氏名なし
import { runAllCelestial } from '../src/lib/celestial';

async function main() {
  console.log('--- Case 1: 時刻・出生地なし、氏名なし ---');
  const r1 = await runAllCelestial({
    birthDate: '1985-05-15',
  });
  console.log('success/failure:', r1.meta.successCount, '/', r1.meta.failureCount);
  const seiyou1 = r1.seiyou as { notice?: string; sun?: { sign?: string } };
  console.log('seiyou.notice:', seiyou1.notice);
  console.log('seiyou.sun.sign:', seiyou1.sun?.sign);
  const hd1 = r1.humandesign as { notice?: string; type?: string };
  console.log('humandesign.notice:', hd1.notice);
  console.log('humandesign.type:', hd1.type);
  const seimei1 = r1.seimei as { notice?: string };
  console.log('seimei.notice:', seimei1.notice);

  console.log('\n--- Case 2: 時刻・氏名あり、出生地なし ---');
  const r2 = await runAllCelestial({
    fullName: '佐藤花子',
    birthDate: '1990-10-22',
    birthTime: '07:15',
  });
  console.log('success/failure:', r2.meta.successCount, '/', r2.meta.failureCount);
  const seiyou2 = r2.seiyou as { notice?: string; sun?: { sign?: string } };
  console.log('seiyou.notice:', seiyou2.notice);
  console.log('seiyou.sun.sign:', seiyou2.sun?.sign);
  const seimei2 = r2.seimei as { notice?: string; lastName?: string; firstName?: string };
  console.log('seimei.lastName/firstName:', seimei2.lastName, '/', seimei2.firstName);

  console.log('\n--- Case 3: フル指定 ---');
  const r3 = await runAllCelestial({
    fullName: '田中一郎',
    birthDate: '1978-12-31',
    birthTime: '23:45',
    birthPlace: { latitude: 34.6937, longitude: 135.5023, timezone: 'Asia/Tokyo' },
    gender: 'male',
  });
  console.log('success/failure:', r3.meta.successCount, '/', r3.meta.failureCount);
  console.log('shichu.yearPillar:', (r3.shichu as { yearPillar?: string }).yearPillar);
  console.log('biorhythm.months[0]:', JSON.stringify(r3.biorhythm.months[0]));
}

main().catch((e) => { console.error(e); process.exit(1); });
