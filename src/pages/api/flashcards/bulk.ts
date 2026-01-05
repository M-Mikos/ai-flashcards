import type { APIRoute } from "astro";

import { bulkCreateFlashcards, bulkCreateFlashcardsSchema, NotFoundError } from "../../../lib/services/flashcards.ts";

export const prerender = false;

const jsonHeaders = { "Content-Type": "application/json" };

const unauthorizedResponse = () =>
  new Response(JSON.stringify({ error: "User not authenticated" }), {
    status: 401,
    headers: jsonHeaders,
  });

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals?.supabase) {
    return new Response(JSON.stringify({ error: "Supabase client not available" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }

  const userId = locals.user?.id;
  if (!userId) {
    return unauthorizedResponse();
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

  const parsed = bulkCreateFlashcardsSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Validation error", details: parsed.error.flatten() }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  try {
    const { result } = await bulkCreateFlashcards({
      supabase: locals.supabase,
      payload: parsed.data,
      userId,
    });

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: jsonHeaders,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // eslint-disable-next-line no-console
    console.error("bulkCreateFlashcards failed", { error });
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
