import { z } from "zod";

import { TEST_USER_ID, type SupabaseClient } from "../../db/supabase.client.ts";
import type { FlashcardCreateResponse, SourceEnum } from "../../types";

/**
 * Zod validation schema for POST /api/flashcards.
 */
const sourceEnumValues: readonly [SourceEnum, SourceEnum, SourceEnum] = ["ai_generated", "ai_edited", "manual"];

export const createFlashcardSchema = z.object({
  front: z
    .string({
      required_error: "front is required",
      invalid_type_error: "front must be a string",
    })
    .min(1, "front must be between 1 and 200 characters")
    .max(200, "front must be between 1 and 200 characters"),
  back: z
    .string({
      required_error: "back is required",
      invalid_type_error: "back must be a string",
    })
    .min(1, "back must be between 1 and 500 characters")
    .max(500, "back must be between 1 and 500 characters"),
  source: z.enum(sourceEnumValues, {
    errorMap: () => ({ message: 'source must be one of "ai_generated", "ai_edited", "manual"' }),
  }),
  generationId: z
    .string()
    .uuid({ message: "generationId must be a valid UUID" })
    .optional()
    .nullable()
    .transform((value) => value ?? null),
});

export type CreateFlashcardInput = z.infer<typeof createFlashcardSchema>;

export interface CreateFlashcardParams {
  supabase: SupabaseClient;
  payload: CreateFlashcardInput;
  userId?: string;
}

export interface CreateFlashcardResult {
  flashcard: FlashcardCreateResponse;
}

export class NotFoundError extends Error {
  status = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Create a single flashcard and optionally link it to an existing generation.
 */
export async function createFlashcard({
  supabase,
  payload,
  userId = TEST_USER_ID,
}: CreateFlashcardParams): Promise<CreateFlashcardResult> {
  if (!supabase) {
    throw new Error("Supabase client is required");
  }

  const parsed = createFlashcardSchema.parse(payload);

  if (parsed.generationId) {
    const { data, error } = await supabase
      .from("generations")
      .select("id")
      .eq("id", parsed.generationId)
      .eq("user_id", userId)
      .single();

    if (error?.code === "PGRST116") {
      throw new NotFoundError("Generation not found");
    }

    if (error) {
      throw new Error(`Failed to verify generation: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundError("Generation not found");
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from("flashcards")
    .insert({
      user_id: userId,
      generation_id: parsed.generationId,
      front: parsed.front,
      back: parsed.back,
      source: parsed.source,
    })
    .select("*")
    .single();

  if (insertError) {
    throw new Error(`Failed to insert flashcard: ${insertError.message}`);
  }

  if (!inserted) {
    throw new Error("Flashcard insertion returned no data");
  }

  const flashcard: FlashcardCreateResponse = {
    id: inserted.id,
    front: inserted.front,
    back: inserted.back,
    source: inserted.source,
    generationId: inserted.generation_id,
    createdAt: inserted.created_at,
  };

  return { flashcard };
}
