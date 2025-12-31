import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";

import { TEST_USER_ID, type SupabaseClient } from "../../db/supabase.client.ts";
import { openRouter } from "./openrouter";
import type {
  CreateGenerationCommand,
  GeneratedFlashcard,
  GenerationCreateResponse,
  GenerationCreateWithFlashcardsResponse,
  JsonSchemaFormat,
  ResponseFormat,
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
 * Create a generation using LLM to propose flashcards.
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

  const inputLength = validated.text.length;
  const hash = createHash("sha256").update(validated.text, "utf8").digest("hex");

  const responseFormat = buildFlashcardsResponseFormat();
  const { flashcards, generationTimeMs } = await generateFlashcardsWithLlm({
    text: validated.text,
    model: validated.model,
    responseFormat,
  });

  const { data, error } = await supabase
    .from("generations")
    .insert({
      user_id: userId,
      hash,
      input_length: inputLength,
      generation_time_ms: generationTimeMs,
      generated_count: flashcards.length,
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

  return { generation, flashcards };
}

function buildFlashcardsResponseFormat(): ResponseFormat {
  const flashcardSchema: JsonSchemaFormat["json_schema"]["schema"] = {
    type: "object",
    properties: {
      flashcards: {
        type: "array",
        minItems: 3,
        maxItems: 20,
        items: {
          type: "object",
          properties: {
            front: { type: "string", minLength: 1, maxLength: 200 },
            back: { type: "string", minLength: 1, maxLength: 500 },
          },
          required: ["front", "back"],
          additionalProperties: false,
        },
      },
    },
    required: ["flashcards"],
    additionalProperties: false,
  };

  const responseFormat: JsonSchemaFormat = {
    type: "json_schema",
    json_schema: {
      name: "flashcards_response",
      strict: true,
      schema: flashcardSchema,
      description: "Flashcards extracted from the provided text",
    },
  };

  return responseFormat;
}

async function generateFlashcardsWithLlm({
  text,
  model,
  responseFormat,
}: {
  text: string;
  model: string;
  responseFormat: ResponseFormat;
}): Promise<{ flashcards: GeneratedFlashcard[]; generationTimeMs: number }> {
  const start = Date.now();

  const systemPrompt =
    "You are a flashcard generator. Create concise Q&A flashcards in the provided JSON schema. " +
    "Use the source text only. Prefer clear, short questions and answers.";
  const userPrompt =
    "Extract 8-12 high-quality flashcards from the text below. " +
    "Return only the JSON; do not include explanations.\n\n" +
    "--- TEXT START ---\n" +
    text +
    "\n--- TEXT END ---";

  const { json } = await openRouter.sendChat(
    [openRouter.buildMessage("system", systemPrompt), openRouter.buildMessage("user", userPrompt)],
    {
      model,
      temperature: 0.3,
      max_tokens: 1200,
      response_format: responseFormat,
    }
  );

  if (!json || typeof json !== "object" || !("flashcards" in json)) {
    throw new Error("LLM response missing flashcards field");
  }

  const rawFlashcards = Array.isArray((json as { flashcards: unknown }).flashcards)
    ? ((json as { flashcards: unknown[] }).flashcards ?? [])
    : [];

  const flashcards = rawFlashcards.reduce<GeneratedFlashcard[]>((acc, item) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as { front?: unknown }).front !== "string" ||
      typeof (item as { back?: unknown }).back !== "string"
    ) {
      return acc;
    }
    const front = (item as { front: string }).front.trim();
    const back = (item as { back: string }).back.trim();
    if (!front || !back) {
      return acc;
    }
    acc.push({
      front,
      back,
      source: "ai_generated",
    });
    return acc;
  }, []);

  if (flashcards.length === 0) {
    throw new Error("LLM returned no valid flashcards");
  }

  const generationTimeMs = Math.max(1, Date.now() - start);
  return { flashcards, generationTimeMs };
}
