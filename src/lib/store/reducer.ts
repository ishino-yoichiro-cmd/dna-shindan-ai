import {
  type DiagnosisState,
  type DiagnosisAction,
  TOTAL_STEPS,
} from './types';

export function createInitialState(): DiagnosisState {
  const now = new Date().toISOString();
  return {
    currentStep: 1,
    userInfo: {
      lastName: '',
      firstName: '',
      birthDate: '',
      birthTimeUnknown: false,
      birthPlaceUnknown: false,
    },
    selectAnswers: {},
    narrativeAnswers: {},
    styleSample: '',
    empathyMessages: {},
    startedAt: now,
    lastSavedAt: now,
  };
}

export function diagnosisReducer(
  state: DiagnosisState,
  action: DiagnosisAction,
): DiagnosisState {
  const stamp = (next: DiagnosisState): DiagnosisState => ({
    ...next,
    lastSavedAt: new Date().toISOString(),
  });

  switch (action.type) {
    case 'GO_NEXT':
      return stamp({
        ...state,
        currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS),
      });
    case 'GO_BACK':
      return stamp({
        ...state,
        currentStep: Math.max(state.currentStep - 1, 1),
      });
    case 'GO_TO':
      return stamp({
        ...state,
        currentStep: Math.min(Math.max(action.step, 1), TOTAL_STEPS),
      });
    case 'SET_USER_INFO':
      return stamp({
        ...state,
        userInfo: { ...state.userInfo, ...action.patch },
      });
    case 'SET_SELECT_ANSWER':
      return stamp({
        ...state,
        selectAnswers: {
          ...state.selectAnswers,
          [action.questionId]: action.choiceId,
        },
      });
    case 'SET_NARRATIVE_ANSWER':
      return stamp({
        ...state,
        narrativeAnswers: {
          ...state.narrativeAnswers,
          [action.questionId]: action.text,
        },
      });
    case 'SET_STYLE_SAMPLE':
      return stamp({ ...state, styleSample: action.text });
    case 'SET_RELATIONSHIP_TAG':
      return stamp({ ...state, relationshipTag: action.tag });
    case 'SET_CELESTIAL_PREVIEW':
      return stamp({ ...state, celestialPreview: action.data });
    case 'SET_EMPATHY_MESSAGE':
      return stamp({
        ...state,
        empathyMessages: {
          ...state.empathyMessages,
          [action.questionId]: action.text,
        },
      });
    case 'HYDRATE':
      return action.state;
    case 'RESET':
      return createInitialState();
    default:
      return state;
  }
}
