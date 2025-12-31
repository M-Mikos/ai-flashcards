import { z } from "zod";

import { TEST_USER_ID, type SupabaseClient } from "../../db/supabase.client.ts";
import type { LearningSessionResponse, SourceEnum } from "../../types";

const sourceEnumValues: readonly [SourceEnum, SourceEnum, SourceEnum] = ["ai_generated", "ai_edited", "manual"];

export const learningSessionSchema = z.object({
  count: z.coerce
    .number({ invalid_type_error: "count must be a number" })
    .int("count must be an integer")
    .min(1, "count must be at least 1")
    .max(100, "count must be at most 100")
    .default(10),
  source: z
    .enum(sourceEnumValues, {
      errorMap: () => ({ message: 'source must be one of "ai_generated", "ai_edited", "manual"' }),
    })
    .optional(),
});

export type LearningSessionInput = z.infer<typeof learningSessionSchema>;

export interface GetLearningSessionParams {
  supabase: SupabaseClient;
  payload: LearningSessionInput;
  userId?: string;
}

export interface GetLearningSessionResult {
  result: LearningSessionResponse;
}

/**
 * Prepare a learning session by selecting flashcards for the user
 * with optional filters and limit.
 */
export async function getLearningSession({
  supabase,
  payload,
  userId = TEST_USER_ID,
}: GetLearningSessionParams): Promise<GetLearningSessionResult> {
  if (!supabase) {
    throw new Error("Supabase client is required");
  }

  const parsed = learningSessionSchema.parse(payload);

  let builder = supabase.from("flashcards").select("id, front, back").eq("user_id", userId);

  if (parsed.source) {
    builder = builder.eq("source", parsed.source);
  }

  const { data, error } = await builder.order("created_at", { ascending: false }).limit(parsed.count);

  if (error) {
    throw new Error(`Failed to fetch learning session cards: ${error.message}`);
  }

  const cards =
    data?.map((row) => ({
      id: row.id,
      front: row.front,
      back: row.back,
    })) ?? [];

  return { result: { cards } };
}
