export type ProposalState = "pending" | "accepted" | "edited" | "rejected";

export interface FlashcardProposal {
  id: string;
  front: string;
  back: string;
  state: ProposalState;
}

export type GenerationStep = 1 | 2;

export interface GenerateViewState {
  step: GenerationStep;
  text: string;
  proposals: FlashcardProposal[];
  generationId: string | null;
}

