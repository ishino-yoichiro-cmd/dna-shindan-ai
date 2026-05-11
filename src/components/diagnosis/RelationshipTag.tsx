'use client';

import { useDiagnosis } from '@/lib/store/DiagnosisProvider';
import {
  RELATIONSHIP_LABELS,
  type RelationshipTag as RelationshipTagType,
} from '@/lib/store/types';
import { Card, GhostButton, PrimaryButton, StepHeader } from './_ui';

interface Props {
  onSubmit: () => void;
  submitting: boolean;
}

const TAGS: RelationshipTagType[] = [
  'mabudachi',
  'tomodachi',
  'kyuyu',
  'business_partner',
  'client',
  'kikaku_sankasha',
  'shiriai',
  'kono_shindan_de_shitta',
];

const DESCRIPTIONS: Record<RelationshipTagType, string> = {
  mabudachi: '人生レベルでわかってる相手',
  tomodachi: '日常的に連絡を取り合う仲',
  kyuyu: '昔からの付き合い・同期・先輩後輩',
  business_partner: '一緒に事業を組んでいる関係',
  client: 'コンサルや仕事を依頼している関係',
  kikaku_sankasha: '講座・セミナー・企画に参加した関係',
  shiriai: '名前は知ってる程度',
  kono_shindan_de_shitta: 'この診断で初めて知った',
};

export function RelationshipTag({ onSubmit, submitting }: Props) {
  const { state, dispatch } = useDiagnosis();
  const selected = state.relationshipTag;

  return (
    <div className="step-enter">
      <Card>
        <StepHeader
          step="STEP 33 / 33 — 最終質問"
          title="この診断を勧めてくれた人との関係を教えてください"
          subtitle="レポートの終章「総括」のニュアンスが、関係性に応じてカスタマイズされます。"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {TAGS.map((tag) => {
            const isSelected = selected === tag;
            return (
              <button
                key={tag}
                onClick={() => dispatch({ type: 'SET_RELATIONSHIP_TAG', tag })}
                disabled={submitting}
                className={`text-left rounded-xl px-4 py-3 transition border ${
                  isSelected
                    ? 'bg-gold/20 border-gold'
                    : 'bg-navy-deep/40 border-gold/15 hover:border-gold/50'
                } disabled:opacity-50`}
              >
                <p className={`font-bold text-sm ${isSelected ? 'text-gold' : 'text-offwhite'}`}>
                  {RELATIONSHIP_LABELS[tag]}
                </p>
                <p className="text-xs text-offwhite-dim mt-0.5">{DESCRIPTIONS[tag]}</p>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center mt-8">
          <GhostButton
            onClick={() => dispatch({ type: 'GO_BACK' })}
            disabled={submitting}
          >
            戻る
          </GhostButton>
          <PrimaryButton
            onClick={onSubmit}
            disabled={!selected || submitting}
          >
            {submitting ? '生成中…' : '診断を完了する'}
          </PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
