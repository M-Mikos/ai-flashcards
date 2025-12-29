import type { Enums, Tables } from "./db/database.types";

/**
 * Shared pagination envelope used by list endpoints.
 */
export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

type GenerationRow = Tables<"generations">;
type FlashcardRow = Tables<"flashcards">;
export type SourceEnum = Enums<"source_enum">;

/**
 * Outbound generation representation (camelCase) derived from the DB row.
 * Keeping fields mapped to DB types ensures drift is caught by the compiler.
 */
export interface GenerationDTO {
  id: GenerationRow["id"];
  hash: GenerationRow["hash"];
  userId: GenerationRow["user_id"];
  modelName: GenerationRow["model_name"];
  inputLength: GenerationRow["input_length"];
  generatedCount: GenerationRow["generated_count"];
  acceptedCount: GenerationRow["accepted_count"];
  acceptedEditedCount: GenerationRow["accepted_edited_count"];
  generationTimeMs: GenerationRow["generation_time_ms"];
  createdAt: GenerationRow["created_at"];
  updatedAt: GenerationRow["updated_at"];
}

/**
 * Request body for POST /api/generations.
 */
export interface CreateGenerationCommand {
  text: string;
  model: "gpt-4o-mini";
}

/**
 * Minimal response after generation creation.
 */
export type GenerationCreateResponse = Pick<
  GenerationDTO,
  "id" | "hash" | "inputLength" | "generatedCount" | "createdAt"
>;

export interface GenerationListQuery {
  page?: number;
  pageSize?: number;
  sort?: "created_at desc" | "created_at asc";
}

export type GenerationListResponse = PaginatedResponse<GenerationDTO>;
export type GenerationDetailResponse = GenerationDTO;

/**
 * Outbound flashcard representation (camelCase) derived from the DB row.
 * userId is intentionally omitted in outward DTOs.
 */
export interface FlashcardDTO {
  id: FlashcardRow["id"];
  front: FlashcardRow["front"];
  back: FlashcardRow["back"];
  source: FlashcardRow["source"];
  generationId: FlashcardRow["generation_id"];
  createdAt: FlashcardRow["created_at"];
  updatedAt: FlashcardRow["updated_at"];
}

/**
 * Request body for POST /api/flashcards.
 */
export interface CreateFlashcardCommand {
  front: FlashcardRow["front"];
  back: FlashcardRow["back"];
  source: SourceEnum;
  generationId: FlashcardRow["generation_id"];
}

/**
 * Request body for PATCH /api/flashcards/:id (partial update).
 */
export type UpdateFlashcardCommand = Partial<Pick<CreateFlashcardCommand, "front" | "back" | "source">>;

export type FlashcardCreateResponse = Pick<
  FlashcardDTO,
  "id" | "front" | "back" | "source" | "generationId" | "createdAt"
>;
export type FlashcardUpdateResponse = FlashcardDTO;
export type FlashcardDetailResponse = FlashcardDTO;

export interface FlashcardListQuery {
  page?: number;
  pageSize?: number;
  source?: SourceEnum;
  generationId?: FlashcardRow["generation_id"];
  sort?: "created_at desc" | "created_at asc";
}

export type FlashcardListResponse = PaginatedResponse<FlashcardDTO>;

/**
 * Request body for POST /api/flashcards/bulk.
 */
export interface BulkCreateFlashcardsCommand {
  generationId: FlashcardRow["generation_id"];
  flashcards: Omit<CreateFlashcardCommand, "generationId">[];
}

export interface BulkCreateFlashcardsResponse {
  created: number;
  ids: FlashcardRow["id"][];
}

/**
 * Request body for POST /api/learning/session.
 */
export interface LearningSessionCommand {
  count?: number;
  source?: SourceEnum;
  generationId?: FlashcardRow["generation_id"];
}

export type LearningSessionCard = Pick<FlashcardDTO, "id" | "front">;

export interface LearningSessionResponse {
  cards: LearningSessionCard[];
}

/**
 * Request body for POST /api/learning/feedback.
 */
export interface LearningFeedbackCommand {
  cardId: FlashcardRow["id"];
  grade: number;
  timestamp: string;
}
