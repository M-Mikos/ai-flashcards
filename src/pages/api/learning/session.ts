import type { APIRoute } from "astro";

import { getLearningSession, learningSessionSchema } from "../../../lib/services/learning.ts";

export const prerender = false;

const jsonHeaders = { "Content-Type": "application/json" };

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals?.supabase) {
    return new Response(JSON.stringify({ error: "Supabase client not available" }), {
      status: 500,
      headers: jsonHeaders,
    });
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

  const parsed = learningSessionSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Validation error", details: parsed.error.flatten() }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  try {
    const { result } = await getLearningSession({
      supabase: locals.supabase,
      payload: parsed.data,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("getLearningSession failed", { error });
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};
