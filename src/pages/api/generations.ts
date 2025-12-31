import type { APIRoute } from "astro";

import { createGeneration, createGenerationSchema } from "../../lib/services/generations.ts";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals?.supabase) {
    return new Response(JSON.stringify({ error: "Supabase client not available" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const parsed = createGenerationSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Validation error", details: parsed.error.flatten() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const result = await createGeneration({
      supabase: locals.supabase,
      ...parsed.data,
    });

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const length = parsed.success ? parsed.data.text.length : undefined;

    // eslint-disable-next-line no-console
    console.error("createGeneration failed", { hash: "redacted", length, error });
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
