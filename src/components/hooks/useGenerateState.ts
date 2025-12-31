import { useCallback, useReducer } from "react";

import type { FlashcardProposal, GenerateViewState, GenerationStep } from "../generate/types";

type Action =
  | { type: "setText"; text: string }
  | { type: "setStep"; step: GenerationStep }
  | { type: "setProposals"; proposals: FlashcardProposal[] }
  | { type: "updateProposal"; id: string; patch: Partial<FlashcardProposal> }
  | { type: "removeProposal"; id: string }
  | { type: "setGenerationId"; generationId: string | null }
  | { type: "reset" };

const initialState: GenerateViewState = {
  step: 1,
  text: "",
  proposals: [],
  generationId: null,
};

function reducer(state: GenerateViewState, action: Action): GenerateViewState {
  switch (action.type) {
    case "setText":
      return { ...state, text: action.text };
    case "setStep":
      return { ...state, step: action.step };
    case "setProposals":
      return { ...state, proposals: action.proposals };
    case "updateProposal":
      return {
        ...state,
        proposals: state.proposals.map((proposal) =>
          proposal.id === action.id ? { ...proposal, ...action.patch } : proposal
        ),
      };
    case "removeProposal":
      return { ...state, proposals: state.proposals.filter((proposal) => proposal.id !== action.id) };
    case "setGenerationId":
      return { ...state, generationId: action.generationId };
    case "reset":
      return initialState;
    default:
      return state;
  }
}

export function useGenerateState(initial?: Partial<GenerateViewState>) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, ...initial });

  const setText = useCallback((text: string) => dispatch({ type: "setText", text }), []);
  const setStep = useCallback((step: GenerationStep) => dispatch({ type: "setStep", step }), []);
  const setProposals = useCallback(
    (proposals: FlashcardProposal[]) => dispatch({ type: "setProposals", proposals }),
    []
  );
  const updateProposal = useCallback(
    (id: string, patch: Partial<FlashcardProposal>) => dispatch({ type: "updateProposal", id, patch }),
    []
  );
  const removeProposal = useCallback((id: string) => dispatch({ type: "removeProposal", id }), []);
  const setGenerationId = useCallback(
    (generationId: string | null) => dispatch({ type: "setGenerationId", generationId }),
    []
  );
  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  return {
    state,
    setText,
    setStep,
    setProposals,
    updateProposal,
    removeProposal,
    setGenerationId,
    reset,
  };
}
