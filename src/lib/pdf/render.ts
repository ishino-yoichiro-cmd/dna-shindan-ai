/**
 * DNA診断AI — PDFレンダリングヘルパ
 *
 * renderReportPdfBuffer(props):
 *   ReportProps から PDF Uint8Array を生成する。
 *   Node runtime 専用（@react-pdf/renderer は Edge 非対応）。
 *
 * /api/pdf 経由で呼ぶラッパ HTTP 層と分離し、
 * /api/submit のような内部オーケストレーターからは関数で直接呼べるようにする。
 */

import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { Report } from '@/components/pdf/Report';
import type { ReportProps } from '@/components/pdf/types';

export async function renderReportPdfBuffer(props: ReportProps): Promise<Uint8Array> {
  // @react-pdf/renderer は React 要素として Document を要求する。
  // Report コンポーネントは Document でラップ済み。
  // SDK 型 (DocumentProps) と React 要素のジェネリクスが合わないので as any で吸収。
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(Report as any, props);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);
  return new Uint8Array(buffer);
}
