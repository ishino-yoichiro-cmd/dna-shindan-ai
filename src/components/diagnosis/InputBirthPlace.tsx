'use client';

import { useState } from 'react';
import { useDiagnosis } from '@/lib/store/DiagnosisProvider';
import { Card, Label, TextInput, PrimaryButton, GhostButton, StepHeader } from './_ui';

// 都道府県中心座標（フォールバック用）
const PREFECTURES: { id: string; label: string; lat: number; lng: number }[] = [
  { id: 'hokkaido',  label: '北海道',     lat: 43.0618, lng: 141.3545 },
  { id: 'aomori',    label: '青森県',     lat: 40.8244, lng: 140.7400 },
  { id: 'iwate',     label: '岩手県',     lat: 39.7036, lng: 141.1527 },
  { id: 'miyagi',    label: '宮城県',     lat: 38.2682, lng: 140.8694 },
  { id: 'akita',     label: '秋田県',     lat: 39.7186, lng: 140.1024 },
  { id: 'yamagata',  label: '山形県',     lat: 38.2404, lng: 140.3633 },
  { id: 'fukushima', label: '福島県',     lat: 37.7503, lng: 140.4676 },
  { id: 'ibaraki',   label: '茨城県',     lat: 36.3418, lng: 140.4468 },
  { id: 'tochigi',   label: '栃木県',     lat: 36.5658, lng: 139.8836 },
  { id: 'gunma',     label: '群馬県',     lat: 36.3911, lng: 139.0608 },
  { id: 'saitama',   label: '埼玉県',     lat: 35.8617, lng: 139.6455 },
  { id: 'chiba',     label: '千葉県',     lat: 35.6075, lng: 140.1233 },
  { id: 'tokyo',     label: '東京都',     lat: 35.6762, lng: 139.6503 },
  { id: 'kanagawa',  label: '神奈川県',   lat: 35.4437, lng: 139.6380 },
  { id: 'niigata',   label: '新潟県',     lat: 37.9026, lng: 139.0233 },
  { id: 'toyama',    label: '富山県',     lat: 36.6953, lng: 137.2113 },
  { id: 'ishikawa',  label: '石川県',     lat: 36.5947, lng: 136.6256 },
  { id: 'fukui',     label: '福井県',     lat: 36.0652, lng: 136.2216 },
  { id: 'yamanashi', label: '山梨県',     lat: 35.6642, lng: 138.5684 },
  { id: 'nagano',    label: '長野県',     lat: 36.6513, lng: 138.1810 },
  { id: 'gifu',      label: '岐阜県',     lat: 35.3912, lng: 136.7223 },
  { id: 'shizuoka',  label: '静岡県',     lat: 34.9756, lng: 138.3829 },
  { id: 'aichi',     label: '愛知県',     lat: 35.1815, lng: 136.9066 },
  { id: 'mie',       label: '三重県',     lat: 34.7303, lng: 136.5085 },
  { id: 'shiga',     label: '滋賀県',     lat: 35.0045, lng: 135.8686 },
  { id: 'kyoto',     label: '京都府',     lat: 35.0116, lng: 135.7681 },
  { id: 'osaka',     label: '大阪府',     lat: 34.6937, lng: 135.5023 },
  { id: 'hyogo',     label: '兵庫県',     lat: 34.6901, lng: 135.1956 },
  { id: 'nara',      label: '奈良県',     lat: 34.6852, lng: 135.8049 },
  { id: 'wakayama',  label: '和歌山県',   lat: 34.2261, lng: 135.1675 },
  { id: 'tottori',   label: '鳥取県',     lat: 35.5036, lng: 134.2381 },
  { id: 'shimane',   label: '島根県',     lat: 35.4723, lng: 133.0505 },
  { id: 'okayama',   label: '岡山県',     lat: 34.6618, lng: 133.9344 },
  { id: 'hiroshima', label: '広島県',     lat: 34.3853, lng: 132.4553 },
  { id: 'yamaguchi', label: '山口県',     lat: 34.1858, lng: 131.4706 },
  { id: 'tokushima', label: '徳島県',     lat: 34.0658, lng: 134.5594 },
  { id: 'kagawa',    label: '香川県',     lat: 34.3401, lng: 134.0434 },
  { id: 'ehime',     label: '愛媛県',     lat: 33.8416, lng: 132.7657 },
  { id: 'kochi',     label: '高知県',     lat: 33.5597, lng: 133.5311 },
  { id: 'fukuoka',   label: '福岡県',     lat: 33.5904, lng: 130.4017 },
  { id: 'saga',      label: '佐賀県',     lat: 33.2494, lng: 130.2989 },
  { id: 'nagasaki',  label: '長崎県',     lat: 32.7448, lng: 129.8737 },
  { id: 'kumamoto',  label: '熊本県',     lat: 32.7898, lng: 130.7416 },
  { id: 'oita',      label: '大分県',     lat: 33.2382, lng: 131.6126 },
  { id: 'miyazaki',  label: '宮崎県',     lat: 31.9111, lng: 131.4239 },
  { id: 'kagoshima', label: '鹿児島県',   lat: 31.5602, lng: 130.5581 },
  { id: 'okinawa',   label: '沖縄県',     lat: 26.2124, lng: 127.6809 },
  { id: 'overseas',  label: '海外',       lat: 0,       lng: 0       },
];

export function InputBirthPlace() {
  const { state, dispatch } = useDiagnosis();
  const { birthPlaceLabel, birthPlaceUnknown } = state.userInfo;
  const [city, setCity] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<'idle' | 'ok' | 'fallback' | 'fail'>('idle');

  const selectPref = (placeId: string) => {
    const p = PREFECTURES.find((x) => x.id === placeId);
    if (!p) return;
    dispatch({
      type: 'SET_USER_INFO',
      patch: {
        birthPlaceLabel: p.label,
        birthPlaceLatitude: p.lat,
        birthPlaceLongitude: p.lng,
        birthPlaceUnknown: false,
      },
    });
    setGeocodeStatus('idle');
  };

  // 市町村テキストをサーバー経由でgeocode（Nominatim + 正規化 + 適切なUser-Agent）
  const refineByCity = async () => {
    if (!birthPlaceLabel || !city.trim()) return;
    setGeocoding(true);
    setGeocodeStatus('idle');
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ city: city.trim(), prefecture: birthPlaceLabel }),
      });
      const data = await res.json();
      if (res.ok && typeof data.lat === 'number') {
        const label = data.fallback
          ? birthPlaceLabel
          : `${birthPlaceLabel} ${city.trim()}`;
        dispatch({
          type: 'SET_USER_INFO',
          patch: {
            birthPlaceLabel: label,
            birthPlaceLatitude: data.lat,
            birthPlaceLongitude: data.lng,
            birthPlaceUnknown: false,
          },
        });
        setGeocodeStatus(data.fallback ? 'fallback' : 'ok');
      } else {
        setGeocodeStatus('fail');
      }
    } catch {
      setGeocodeStatus('fail');
    } finally {
      setGeocoding(false);
    }
  };

  const handleUnknown = () => {
    if (birthPlaceUnknown) {
      // トグルOFF: 「不明」を解除して選択可能に戻す
      dispatch({
        type: 'SET_USER_INFO',
        patch: { birthPlaceUnknown: false },
      });
    } else {
      dispatch({
        type: 'SET_USER_INFO',
        patch: {
          birthPlaceLabel: undefined,
          birthPlaceLatitude: undefined,
          birthPlaceLongitude: undefined,
          birthPlaceUnknown: true,
        },
      });
      setGeocodeStatus('idle');
    }
  };

  const canProceed = !!birthPlaceLabel || birthPlaceUnknown;

  const currentPrefId =
    PREFECTURES.find(
      (p) => birthPlaceLabel === p.label || birthPlaceLabel?.startsWith(p.label + ' '),
    )?.id ?? '';

  return (
    <div className="step-enter">
      <Card>
        <StepHeader
          step="STEP 4 / 33 (任意)"
          title="生まれた場所を教えてください"
          subtitle="西洋占星のアセンダント・ハウス計算は経度・緯度に直結します。市町村まで入力すると精度が上がります（無料geocoding APIで自動座標化）。"
        />

        <div className="space-y-4">
          <div>
            <Label>都道府県</Label>
            <select
              value={currentPrefId}
              onChange={(e) => selectPref(e.target.value)}
              disabled={birthPlaceUnknown}
              className="w-full bg-navy-deep/60 border border-gold/30 rounded-lg px-3 py-3 text-offwhite focus:border-gold disabled:opacity-40"
            >
              <option value="">— 選択してください —</option>
              {PREFECTURES.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div>
            <Label>市区町村（任意・推奨）</Label>
            <div className="flex gap-2">
              <TextInput
                type="text"
                placeholder="例：渋谷区、横浜市港北区、京都市左京区"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={birthPlaceUnknown || !birthPlaceLabel}
                maxLength={40}
              />
              <button
                onClick={refineByCity}
                disabled={birthPlaceUnknown || !birthPlaceLabel || !city.trim() || geocoding}
                className="px-4 py-2 rounded-lg border border-gold/40 text-gold text-sm whitespace-nowrap hover:bg-gold/10 disabled:opacity-40"
              >
                {geocoding ? '取得中…' : '座標化'}
              </button>
            </div>
            <p className="text-xs text-offwhite-dim/70 mt-2 leading-relaxed">
              {geocodeStatus === 'ok' &&
                <span className="text-gold">市区町村レベルの座標を反映しました（精度UP）</span>}
              {geocodeStatus === 'fallback' &&
                <span className="text-yellow-400">市区町村が特定できず、都道府県の中心座標を使用しました（都道府県だけでも問題なく診断できます）</span>}
              {geocodeStatus === 'fail' &&
                <span className="text-red-300">座標化に失敗しました。都道府県だけのまま次に進むか「出生地は不明」をお選びください。</span>}
              {geocodeStatus === 'idle' &&
                '市区町村まで入力して「座標化」を押すとアセンダント精度が向上します（任意）'}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <button
            onClick={handleUnknown}
            className={`w-full text-sm py-2.5 rounded-lg border ${
              birthPlaceUnknown
                ? 'bg-gold/20 border-gold text-gold'
                : 'border-offwhite-dim/30 text-offwhite-dim hover:border-gold/50'
            } transition`}
          >
            出生地は不明 / 答えたくない
          </button>
        </div>

        <div className="flex justify-between items-center mt-8">
          <GhostButton onClick={() => dispatch({ type: 'GO_BACK' })}>戻る</GhostButton>
          <PrimaryButton
            onClick={() => dispatch({ type: 'GO_NEXT' })}
            disabled={!canProceed}
          >
            次へ
          </PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
