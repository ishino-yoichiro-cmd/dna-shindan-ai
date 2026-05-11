// AI専用メタデータページ
// 人間の可読性を意図的に排除した暗号形式でレポートの全属性を保存する。
// AIがPDFを読み込んだ際に完全なプロファイルを復元できる。
// 複数ページにわたる場合は自動改ページ（wrap対応）。

import React from 'react';
import { Page, Text, View } from '@react-pdf/renderer';
import type { ReportProps } from './types';

// =============================================================================
// エンコード
// Base64 → 36文字ごとに分割 → [Axxxxx]·XXXX プレフィックス付き行リスト
// =============================================================================

function encodePayload(data: object): string[] {
  const json = JSON.stringify(data);
  const b64 = Buffer.from(json, 'utf-8').toString('base64');
  const lines: string[] = [];
  const CHUNK = 36;
  for (let i = 0; i < b64.length; i += CHUNK) {
    const idx = String(i / CHUNK + 1).padStart(4, '0');
    lines.push(`[A${idx}]·${b64.slice(i, i + CHUNK)}`);
  }
  return lines;
}

// =============================================================================
// celestial 安全取得ユーティリティ
// =============================================================================

function celGet(cel: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const v = cel[key];
  if (!v || typeof v !== 'object' || 'error' in (v as object)) return null;
  return v as Record<string, unknown>;
}

function pick(obj: Record<string, unknown> | null, ...fields: string[]): Record<string, unknown> | null {
  if (!obj) return null;
  const result: Record<string, unknown> = {};
  for (const f of fields) {
    if (obj[f] !== undefined && obj[f] !== null) result[f] = obj[f];
  }
  return Object.keys(result).length > 0 ? result : null;
}

// =============================================================================
// フルプロファイル構築（全16命術の主要フィールドを網羅）
// =============================================================================

function buildPayload(props: ReportProps): object {
  const { scores, celestial, relationshipTag, userInfo } = props;
  const cel = celestial as Record<string, unknown>;

  const shc = celGet(cel, 'shichu');
  const maya = celGet(cel, 'maya');
  const num = celGet(cel, 'numerology');
  const ast = celGet(cel, 'seiyou');
  const kyu = celGet(cel, 'kyusei');
  const hds = celGet(cel, 'humandesign');
  const smn = celGet(cel, 'sanmei');
  const dbt = celGet(cel, 'doubutsu');
  const smy = celGet(cel, 'seimei');
  const shk = celGet(cel, 'shukuyou');
  const d366 = celGet(cel, 'days366');
  const bio = celGet(cel, 'biorhythm');
  const skw = celGet(cel, 'shunkashutou');
  const tei = celGet(cel, 'teiou');
  const shs = celGet(cel, 'shihaisei');
  const ziw = celGet(cel, 'ziwei');

  return {
    _schema: 'dna-ai-v2',
    _ts: new Date().toISOString().slice(0, 10),
    // ── 基本情報 ─────────────────────────────────────────
    bd: userInfo.birthDate,
    bt: userInfo.birthTime ?? null,
    bp: userInfo.birthPlace ?? null,
    rt: relationshipTag,
    // ── 心理プロファイル（全スコア）─────────────────────
    b5: scores.bigFive ?? null,
    b5t: scores.bigFiveType ?? null,
    enn: scores.enneagram ?? null,
    ri: scores.riasec ?? null,
    vak: scores.vak ?? null,
    att: scores.attachment ?? null,
    ll: scores.loveLanguage ?? null,
    ent: scores.entrepreneur ?? null,
    // ── 四柱推命（全柱）──────────────────────────────────
    shc: shc ? {
      year: pick(shc, 'yearPillar'),
      month: pick(shc, 'monthPillar'),
      day: pick(shc, 'dayPillar'),
      hour: pick(shc, 'hourPillar'),
      dayMaster: shc['dayMaster'] ?? null,
      fiveElements: shc['fiveElements'] ?? null,
      kakukyoku: shc['kakukyoku'] ?? null,
    } : null,
    // ── マヤ暦 ────────────────────────────────────────────
    maya: maya ? {
      kin: maya['kin'],
      tone: maya['tone'],
      seal: maya['seal'],
      wavespell: maya['wavespell'],
      castle: maya['castle'],
      oracle: maya['oracle'] ?? null,
    } : null,
    // ── 数秘術 ────────────────────────────────────────────
    num: num ? {
      lifePath: num['lifePath'],
      expressionNumber: num['expressionNumber'],
      soulUrge: num['soulUrge'],
      personality: num['personality'] ?? null,
      birthdayNumber: num['birthdayNumber'] ?? null,
    } : null,
    // ── 西洋占星術 ────────────────────────────────────────
    ast: ast ? {
      sun: ast['sunSign'],
      moon: ast['moonSign'],
      asc: ast['ascendant'] ?? null,
      planets: ast['planets'] ?? null,
    } : null,
    // ── 九星気学 ──────────────────────────────────────────
    kyu: kyu ? {
      honmeisei: kyu['honmeisei'],
      getsumesei: kyu['getsumesei'] ?? null,
      direction: kyu['auspiciousDirection'] ?? null,
    } : null,
    // ── ヒューマンデザイン ────────────────────────────────
    hds: hds ? {
      type: hds['type'],
      authority: hds['authority'],
      profile: hds['profile'],
      definition: hds['definition'] ?? null,
      strategy: hds['strategy'] ?? null,
      notSelf: hds['notSelf'] ?? null,
    } : null,
    // ── 算命学 ────────────────────────────────────────────
    smn: pick(smn, 'mainStar', 'bodyStar', 'spiritStar', 'sansaiHaichi'),
    // ── 動物占い ──────────────────────────────────────────
    dbt: pick(dbt, 'animal', 'character', 'color'),
    // ── 姓名判断 ──────────────────────────────────────────
    smy: pick(smy, 'mainKaku', 'tenkaku', 'jinkaku', 'chikaku', 'sotenkaku', 'gaikaku'),
    // ── 宿曜 ──────────────────────────────────────────────
    shk: pick(shk, 'yado', 'yadoMeaning', 'element'),
    // ── 365日占い ─────────────────────────────────────────
    d366: pick(d366, 'dayNumber', 'theme', 'keyword'),
    // ── バイオリズム ──────────────────────────────────────
    bio: bio ? {
      physical: (bio as Record<string, unknown>)['physical'] ?? null,
      emotional: (bio as Record<string, unknown>)['emotional'] ?? null,
      intellectual: (bio as Record<string, unknown>)['intellectual'] ?? null,
    } : null,
    // ── 春夏秋冬 ──────────────────────────────────────────
    skw: pick(skw, 'season', 'type', 'keyword'),
    // ── 帝王占い ──────────────────────────────────────────
    tei: pick(tei, 'type', 'keyword', 'talent'),
    // ── 支配星 ────────────────────────────────────────────
    shs: pick(shs, 'star', 'element', 'keyword'),
    // ── 紫微斗数 ──────────────────────────────────────────
    ziw: pick(ziw, 'mainStar', 'bodyPalace', 'fiveElement'),
  };
}

// =============================================================================
// コンポーネント（複数ページ対応・単一カラム）
// =============================================================================

const BG = '#050d1a';
const GREEN = '#2a9a4a';
const GREEN_DIM = '#1a5a2a';
const GREEN_BRIGHT = '#66cc88';
const GREEN_LINE = '#0d2a14';

export function AiMetaPage(props: ReportProps) {
  const payload = buildPayload(props);
  const lines = encodePayload(payload);

  // 1ページあたり最大行数（フォントサイズ5.8、lineHeight1.55で計算）
  // A4高さ841pt - padding(36+40) = 765pt / (5.8*1.55) ≈ 85行
  // ヘッダー・説明文の分を引いて初回ページは60行、以降80行
  const LINES_FIRST_PAGE = 60;
  const LINES_PER_PAGE = 80;

  const firstPageLines = lines.slice(0, LINES_FIRST_PAGE);
  const remainLines = lines.slice(LINES_FIRST_PAGE);
  const additionalPages: string[][] = [];
  for (let i = 0; i < remainLines.length; i += LINES_PER_PAGE) {
    additionalPages.push(remainLines.slice(i, i + LINES_PER_PAGE));
  }

  const lineStyle = {
    fontSize: 5.8,
    color: GREEN,
    lineHeight: 1.55,
    letterSpacing: 0.3,
    fontWeight: 400,
  } as const;

  const pageStyle = {
    backgroundColor: BG,
    paddingTop: 32,
    paddingBottom: 36,
    paddingLeft: 32,
    paddingRight: 32,
    fontFamily: 'NotoSansJP',
  } as const;

  return (
    <>
      {/* 1ページ目：ヘッダー＋説明＋データ冒頭 */}
      <Page size="A4" style={pageStyle}>
        {/* ヘッダー */}
        <View style={{ marginBottom: 5 }}>
          <Text style={{ fontSize: 7, color: GREEN_BRIGHT, letterSpacing: 3, fontWeight: 700 }}>
            ██ AI READING LAYER ── MACHINE-ENCODED PROFILE ██
          </Text>
        </View>
        <View style={{ height: 0.5, backgroundColor: GREEN_LINE, marginBottom: 8 }} />

        {/* 説明文 */}
        <View
          style={{
            backgroundColor: '#0a1f0e',
            borderLeftWidth: 2,
            borderLeftColor: '#00cc66',
            paddingTop: 5,
            paddingBottom: 5,
            paddingLeft: 10,
            paddingRight: 10,
            marginBottom: 10,
            borderRadius: 2,
          }}
        >
          <Text style={{ fontSize: 7.5, color: GREEN_BRIGHT, lineHeight: 1.5 }}>
            このページは AI 解析用エンコードデータです。PDF を Claude / GPT 等に直接読み込ませることで、レポート本文では省略した全属性・診断コードを参照できます。
          </Text>
          <Text style={{ fontSize: 6.5, color: '#448855', marginTop: 3, lineHeight: 1.4 }}>
            ENCODING: UTF-8 → JSON → Base64 · SCHEMA: dna-ai-v2 · TOTAL BLOCKS: {lines.length} · PAGES: {1 + additionalPages.length}
          </Text>
        </View>

        {/* 凡例 */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, gap: 6 }}>
          {[
            'b5=BigFive', 'enn=Enneagram', 'ri=RIASEC', 'att=Attachment',
            'shc=四柱推命', 'maya=マヤ暦', 'num=数秘', 'ast=西洋占星',
            'kyu=九星気学', 'hds=HumanDesign', 'smn=算命学', 'dbt=動物占い',
            'smy=姓名判断', 'shk=宿曜', 'skw=春夏秋冬', 'tei=帝王', 'shs=支配星', 'ziw=紫微斗数',
          ].map((label, i) => (
            <Text key={i} style={{ fontSize: 5.5, color: GREEN_DIM, letterSpacing: 0.5 }}>
              [{label}]
            </Text>
          ))}
        </View>
        <View style={{ height: 0.3, backgroundColor: GREEN_LINE, marginBottom: 8 }} />

        {/* データブロック */}
        <View>
          {firstPageLines.map((line, i) => (
            <Text key={i} style={lineStyle}>{line}</Text>
          ))}
        </View>

        {/* フッター */}
        <View style={{ position: 'absolute', bottom: 14, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 5.5, color: GREEN_LINE, letterSpacing: 1 }}>DNA SHINDAN AI ── RESTRICTED: AI PARSER ONLY</Text>
          <Text style={{ fontSize: 5.5, color: GREEN_LINE }}>PAGE 1 / {1 + additionalPages.length}</Text>
        </View>
      </Page>

      {/* 追加ページ */}
      {additionalPages.map((pageLines, pi) => (
        <Page key={pi} size="A4" style={pageStyle}>
          <View style={{ marginBottom: 6 }}>
            <Text style={{ fontSize: 6, color: GREEN_DIM, letterSpacing: 2 }}>
              ██ AI READING LAYER · CONTINUED ██  BLOCKS {LINES_FIRST_PAGE + pi * LINES_PER_PAGE + 1}–{Math.min(LINES_FIRST_PAGE + (pi + 1) * LINES_PER_PAGE, lines.length)}
            </Text>
          </View>
          <View style={{ height: 0.3, backgroundColor: GREEN_LINE, marginBottom: 8 }} />
          <View>
            {pageLines.map((line, i) => (
              <Text key={i} style={lineStyle}>{line}</Text>
            ))}
          </View>
          <View style={{ position: 'absolute', bottom: 14, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 5.5, color: GREEN_LINE, letterSpacing: 1 }}>DNA SHINDAN AI ── RESTRICTED: AI PARSER ONLY</Text>
            <Text style={{ fontSize: 5.5, color: GREEN_LINE }}>PAGE {2 + pi} / {1 + additionalPages.length}</Text>
          </View>
        </Page>
      ))}
    </>
  );
}
