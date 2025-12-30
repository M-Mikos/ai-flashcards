import { z } from "zod";

import { TEST_USER_ID, type SupabaseClient } from "../../db/supabase.client.ts";
import type {
  BulkCreateFlashcardsResponse,
  FlashcardCreateResponse,
  FlashcardDetailResponse,
  FlashcardListQuery,
  FlashcardListResponse,
  FlashcardUpdateResponse,
  SourceEnum,
  UpdateFlashcardCommand,
} from "../../types";

/**
 * Zod validation schema for POST /api/flashcards.
 */
const sourceEnumValues: readonly [SourceEnum, SourceEnum, SourceEnum] = ["ai_generated", "ai_edited", "manual"];

/**
 * Zod validation schema for path param id on /api/flashcards/:id.
 */
export const idParamSchema = z.object({
  id: z.string().uuid({ message: "id must be a valid UUID" }),
});

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

/**
 * Zod validation schema for POST /api/flashcards/bulk.
 */
export const bulkCreateFlashcardsSchema = z.object({
  generationId: z
    .string()
    .uuid({ message: "generationId must be a valid UUID" })
    .optional()
    .nullable()
    .transform((value) => value ?? null),
  flashcards: z
    .array(createFlashcardSchema.omit({ generationId: true }))
    .min(1, "flashcards must contain between 1 and 50 items")
    .max(50, "flashcards must contain between 1 and 50 items"),
});

export type BulkCreateFlashcardsInput = z.infer<typeof bulkCreateFlashcardsSchema>;

/**
 * Zod validation schema for PATCH /api/flashcards/:id.
 */
export const updateFlashcardSchema = z
  .object({
    front: z
      .string({
        invalid_type_error: "front must be a string",
      })
      .min(1, "front must be between 1 and 200 characters")
      .max(200, "front must be between 1 and 200 characters")
      .optional(),
    back: z
      .string({
        invalid_type_error: "back must be a string",
      })
      .min(1, "back must be between 1 and 500 characters")
      .max(500, "back must be between 1 and 500 characters")
      .optional(),
    source: z
      .enum(sourceEnumValues, {
        errorMap: () => ({ message: 'source must be one of "ai_generated", "ai_edited", "manual"' }),
      })
      .optional(),
  })
  .refine((data) => data.front !== undefined || data.back !== undefined || data.source !== undefined, {
    message: "At least one of front, back, or source must be provided",
  });

export type UpdateFlashcardInput = z.infer<typeof updateFlashcardSchema>;

/**
 * Zod validation schema for GET /api/flashcards.
 */
export const listFlashcardsSchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: "page must be a number" })
    .int("page must be an integer")
    .min(1, "page must be at least 1")
    .default(1),
  pageSize: z.coerce
    .number({ invalid_type_error: "pageSize must be a number" })
    .int("pageSize must be an integer")
    .min(1, "pageSize must be at least 1")
    .max(100, "pageSize must be at most 100")
    .default(24),
  source: z
    .enum(sourceEnumValues, {
      errorMap: () => ({ message: 'source must be one of "ai_generated", "ai_edited", "manual"' }),
    })
    .optional(),
  generationId: z.string().uuid({ message: "generationId must be a valid UUID" }).optional(),
  sort: z
    .enum(["created_at desc", "created_at asc"], {
      errorMap: () => ({ message: 'sort must be "created_at desc" or "created_at asc"' }),
    })
    .default("created_at desc"),
});

export type ListFlashcardsInput = z.infer<typeof listFlashcardsSchema>;

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

export interface BulkCreateFlashcardsParams {
  supabase: SupabaseClient;
  payload: BulkCreateFlashcardsInput;
  userId?: string;
}

export interface BulkCreateFlashcardsResult {
  result: BulkCreateFlashcardsResponse;
}

/**
 * Insert multiple flashcards in a single batch and optionally link them to a generation.
 */
export async function bulkCreateFlashcards({
  supabase,
  payload,
  userId = TEST_USER_ID,
}: BulkCreateFlashcardsParams): Promise<BulkCreateFlashcardsResult> {
  if (!supabase) {
    throw new Error("Supabase client is required");
  }

  const parsed = bulkCreateFlashcardsSchema.parse(payload);

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

  const records = parsed.flashcards.map((flashcard) => ({
    user_id: userId,
    generation_id: parsed.generationId,
    front: flashcard.front,
    back: flashcard.back,
    source: flashcard.source,
  }));

  const { data: inserted, error: insertError } = await supabase.from("flashcards").insert(records).select("id");

  if (insertError) {
    throw new Error(`Failed to insert flashcards: ${insertError.message}`);
  }

  if (!inserted || inserted.length === 0) {
    throw new Error("Flashcards insertion returned no data");
  }

  const result: BulkCreateFlashcardsResponse = {
    created: inserted.length,
    ids: inserted.map((row) => row.id),
  };

  return { result };
}

export interface ListFlashcardsParams {
  supabase: SupabaseClient;
  query: FlashcardListQuery;
  userId?: string;
}

export interface ListFlashcardsResult {
  result: FlashcardListResponse;
}

/**
 * List flashcards for a user with optional filters and pagination.
 */
export async function listFlashcards({
  supabase,
  query,
  userId = TEST_USER_ID,
}: ListFlashcardsParams): Promise<ListFlashcardsResult> {
  if (!supabase) {
    throw new Error("Supabase client is required");
  }

  const parsed = listFlashcardsSchema.parse(query);

  const offset = (parsed.page - 1) * parsed.pageSize;
  const ascending = parsed.sort === "created_at asc";

  let builder = supabase.from("flashcards").select("*", { count: "exact" }).eq("user_id", userId);

  if (parsed.source) {
    builder = builder.eq("source", parsed.source);
  }

  const { data, error, count } = await builder
    .order("created_at", { ascending })
    .range(offset, offset + parsed.pageSize - 1);

  if (error) {
    throw new Error(`Failed to list flashcards: ${error.message}`);
  }

  const items =
    data?.map((row) => ({
      id: row.id,
      front: row.front,
      back: row.back,
      source: row.source,
      generationId: row.generation_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })) ?? [];

  const result: FlashcardListResponse = {
    items,
    page: parsed.page,
    pageSize: parsed.pageSize,
    total: count ?? 0,
  };

  return { result };
}

export interface GetFlashcardByIdParams {
  supabase: SupabaseClient;
  id: string;
  userId?: string;
}

export interface GetFlashcardByIdResult {
  flashcard: FlashcardDetailResponse;
}

/**
 * Fetch a single flashcard owned by the user.
 */
export async function getFlashcardById({
  supabase,
  id,
  userId = TEST_USER_ID,
}: GetFlashcardByIdParams): Promise<GetFlashcardByIdResult> {
  if (!supabase) {
    throw new Error("Supabase client is required");
  }

  const { data, error } = await supabase.from("flashcards").select("*").eq("id", id).eq("user_id", userId).single();

  if (error?.code === "PGRST116") {
    throw new NotFoundError("Flashcard not found");
  }

  if (error) {
    throw new Error(`Failed to fetch flashcard: ${error.message}`);
  }

  if (!data) {
    throw new NotFoundError("Flashcard not found");
  }

  const flashcard: FlashcardDetailResponse = {
    id: data.id,
    front: data.front,
    back: data.back,
    source: data.source,
    generationId: data.generation_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return { flashcard };
}

export interface UpdateFlashcardParams {
  supabase: SupabaseClient;
  id: string;
  payload: UpdateFlashcardCommand;
  userId?: string;
}

export interface UpdateFlashcardResult {
  flashcard: FlashcardUpdateResponse;
}

/**
 * Partially update a flashcard. If front/back change and previous source was ai_generated,
 * the source is upgraded to ai_edited unless the client explicitly sets manual.
 */
export async function updateFlashcard({
  supabase,
  id,
  payload,
  userId = TEST_USER_ID,
}: UpdateFlashcardParams): Promise<UpdateFlashcardResult> {
  if (!supabase) {
    throw new Error("Supabase client is required");
  }

  const parsed = updateFlashcardSchema.parse(payload);

  const { data: existing, error: fetchError } = await supabase
    .from("flashcards")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (fetchError?.code === "PGRST116") {
    throw new NotFoundError("Flashcard not found");
  }

  if (fetchError) {
    throw new Error(`Failed to fetch flashcard: ${fetchError.message}`);
  }

  if (!existing) {
    throw new NotFoundError("Flashcard not found");
  }

  const frontChanged = parsed.front !== undefined && parsed.front !== existing.front;
  const backChanged = parsed.back !== undefined && parsed.back !== existing.back;

  let nextSource: SourceEnum = existing.source;
  if (parsed.source) {
    nextSource = parsed.source;
  } else if ((frontChanged || backChanged) && existing.source === "ai_generated") {
    nextSource = "ai_edited";
  }

  const updates: Record<string, unknown> = {};
  if (parsed.front !== undefined) updates.front = parsed.front;
  if (parsed.back !== undefined) updates.back = parsed.back;
  if (nextSource !== existing.source || parsed.source !== undefined) {
    updates.source = nextSource;
  }

  const { data, error } = await supabase
    .from("flashcards")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error?.code === "PGRST116") {
    throw new NotFoundError("Flashcard not found");
  }

  if (error) {
    throw new Error(`Failed to update flashcard: ${error.message}`);
  }

  if (!data) {
    throw new Error("Flashcard update returned no data");
  }

  const flashcard: FlashcardUpdateResponse = {
    id: data.id,
    front: data.front,
    back: data.back,
    source: data.source,
    generationId: data.generation_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };

  return { flashcard };
}

export interface DeleteFlashcardParams {
  supabase: SupabaseClient;
  id: string;
  userId?: string;
}

export interface DeleteFlashcardResult {
  id: string;
}

/**
 * Delete a single flashcard owned by the user.
 */
export async function deleteFlashcard({
  supabase,
  id,
  userId = TEST_USER_ID,
}: DeleteFlashcardParams): Promise<DeleteFlashcardResult> {
  if (!supabase) {
    throw new Error("Supabase client is required");
  }

  const { data, error } = await supabase
    .from("flashcards")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .single();

  if (error?.code === "PGRST116") {
    throw new NotFoundError("Flashcard not found");
  }

  if (error) {
    throw new Error(`Failed to delete flashcard: ${error.message}`);
  }

  if (!data?.id) {
    throw new NotFoundError("Flashcard not found");
  }

  return { id: data.id };
}
