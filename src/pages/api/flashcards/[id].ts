import type { APIRoute } from "astro";

import {
  deleteFlashcard,
  getFlashcardById,
  idParamSchema,
  NotFoundError,
  updateFlashcard,
  updateFlashcardSchema,
} from "../../../lib/services/flashcards.ts";
import type { SupabaseClient } from "../../../db/supabase.client.ts";

export const prerender = false;

const jsonHeaders = { "Content-Type": "application/json" };

const supabaseMissingResponse = () =>
  new Response(JSON.stringify({ error: "Supabase client not available" }), {
    status: 500,
    headers: jsonHeaders,
  });

function validateIdParam(params: Record<string, string | undefined>) {
  const parsed = idParamSchema.safeParse({ id: params.id });
  if (!parsed.success) {
    return {
      error: new Response(JSON.stringify({ error: "Validation error", details: parsed.error.flatten() }), {
        status: 400,
        headers: jsonHeaders,
      }),
    };
  }

  return { id: parsed.data.id };
}

export const GET: APIRoute = async ({ params, locals }) => {
  if (!locals?.supabase) {
    return supabaseMissingResponse();
  }

  const { id, error: idError } = validateIdParam(params);
  if (idError) {
    return idError;
  }

  try {
    const { flashcard } = await getFlashcardById({
      supabase: locals.supabase,
      id,
    });

    return new Response(JSON.stringify(flashcard), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    // eslint-disable-next-line no-console
    console.error("getFlashcardById failed", { id, error });
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

export const PATCH: APIRoute = async ({ request, params, locals }) => {
  if (!locals?.supabase) {
    return supabaseMissingResponse();
  }

  const { id, error: idError } = validateIdParam(params);
  if (idError) {
    return idError;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const parsedBody = updateFlashcardSchema.safeParse(body);
  if (!parsedBody.success) {
    return new Response(JSON.stringify({ error: "Validation error", details: parsedBody.error.flatten() }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  try {
    const { flashcard } = await updateFlashcard({
      supabase: locals.supabase,
      id,
      payload: parsedBody.data,
    });

    return new Response(JSON.stringify(flashcard), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    // eslint-disable-next-line no-console
    console.error("updateFlashcard failed", { id, error });
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

export const DELETE: APIRoute = async ({ params, locals }) => {
  if (!locals?.supabase) {
    return supabaseMissingResponse();
  }

  const { id, error: idError } = validateIdParam(params);
  if (idError) {
    return idError;
  }

  try {
    await deleteFlashcard({
      supabase: locals.supabase,
      id,
    });

    return new Response(null, {
      status: 204,
      headers: jsonHeaders,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: jsonHeaders,
      });
    }

    // eslint-disable-next-line no-console
    console.error("deleteFlashcard failed", { id, error });
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
