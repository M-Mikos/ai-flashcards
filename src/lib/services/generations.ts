import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

import { TEST_USER_ID, type SupabaseClient } from "../../db/supabase.client.ts";
import type {
  CreateGenerationCommand,
  GeneratedFlashcard,
  GenerationCreateResponse,
  GenerationCreateWithFlashcardsResponse,
} from "../../types";

/**
 * Zod validation schema for POST /api/generations.
 */
export const createGenerationSchema = z.object({
  text: z
    .string({
      required_error: "text is required",
      invalid_type_error: "text must be a string",
    })
    .min(1000, "text must be between 1000 and 10000 characters")
    .max(10000, "text must be between 1000 and 10000 characters"),
  model: z.literal("gpt-4o-mini", {
    errorMap: () => ({ message: 'model must be "gpt-4o-mini"' }),
  }),
});

export type CreateGenerationInput = CreateGenerationCommand;

export interface CreateGenerationParams extends CreateGenerationInput {
  supabase: SupabaseClient;
  userId?: string;
}

export type CreateGenerationResult = GenerationCreateWithFlashcardsResponse;

/**
 * Create a generation stub. Business logic and persistence will be added next.
 */
export async function createGeneration({
  supabase,
  userId = TEST_USER_ID,
  text,
  model,
}: CreateGenerationParams): Promise<CreateGenerationResult> {
  if (!supabase) {
    throw new Error("Supabase client is required");
  }

  const validated = createGenerationSchema.parse({ text, model });

  const mockFlashcards: GeneratedFlashcard[] = [
    {
      front: "What is spaced repetition?",
      back: "A learning technique that schedules reviews to optimize memory.",
      source: "ai_generated",
    },
    {
      front: "Why use flashcards?",
      back: "They encourage active recall and spaced practice to improve retention.",
      source: "ai_generated",
    },
    {
      front: "How many cards to review daily?",
      back: "Start small (10–20) and adjust based on comfort and time.",
      source: "ai_generated",
    },
  ];

  const startTime = Date.now();
  const inputLength = validated.text.length;
  const hash = createHash("sha256").update(validated.text, "utf8").digest("hex");
  // Placeholder for AI call; measure around future generation step.
  const generationTimeMs = Math.max(1, Date.now() - startTime);

  const { data, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      hash,
      input_length: inputLength,
      generation_time_ms: generationTimeMs,
      generated_count: mockFlashcards.length,
      accepted_count: 0,
      accepted_edited_count: 0,
      model_name: validated.model,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert generation: ${error?.message ?? "unknown error"}`);
  }

  const generation: GenerationCreateResponse = {
    id: data.id ?? randomUUID(),
    hash: data.hash,
    inputLength: data.input_length,
    generatedCount: data.generated_count,
    createdAt: data.created_at ?? new Date().toISOString(),
  };

  return { generation, flashcards: mockFlashcards };
}
