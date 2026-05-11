'use client';

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  type DiagnosisState,
  type DiagnosisAction,
  STORAGE_KEY,
  STORAGE_KEY_LEGACY,
  STORAGE_TTL_MS,
  TOTAL_STEPS,
} from './types';
import { diagnosisReducer, createInitialState } from './reducer';

interface DiagnosisContextValue {
  state: DiagnosisState;
  dispatch: React.Dispatch<DiagnosisAction>;
  reset: () => void;
}

const DiagnosisContext = createContext<DiagnosisContextValue | null>(null);

export function DiagnosisProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(
    diagnosisReducer,
    undefined,
    createInitialState,
  );

  // Hydrate from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // 旧バージョンの localStorage キーを起動時に明示削除（破壊的バージョン移行）
    // 例：v1（40問仕様）→ v2（30問仕様）で残存セッションが Step 31-40 を踏むと ErrorPlaceholder に落ちる
    try {
      for (const oldKey of STORAGE_KEY_LEGACY) {
        if (window.localStorage.getItem(oldKey)) {
          window.localStorage.removeItem(oldKey);
        }
      }
    } catch {
      // ignore
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as DiagnosisState;
      const lastSaved = new Date(parsed.lastSavedAt).getTime();
      const stepValid =
        typeof parsed.currentStep === 'number' &&
        parsed.currentStep >= 1 &&
        parsed.currentStep <= TOTAL_STEPS;
      if (
        Number.isFinite(lastSaved) &&
        Date.now() - lastSaved < STORAGE_TTL_MS &&
        stepValid
      ) {
        dispatch({ type: 'HYDRATE', state: parsed });
      } else {
        // TTL切れ or step不整合 → 破棄して新規スタート
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore corrupted storage
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // quota or private mode
    }
  }, [state]);

  const reset = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    dispatch({ type: 'RESET' });
  }, []);

  const value = useMemo(() => ({ state, dispatch, reset }), [state, reset]);

  return (
    <DiagnosisContext.Provider value={value}>
      {children}
    </DiagnosisContext.Provider>
  );
}

export function useDiagnosis() {
  const ctx = useContext(DiagnosisContext);
  if (!ctx) {
    throw new Error('useDiagnosis must be used inside DiagnosisProvider');
  }
  return ctx;
}
