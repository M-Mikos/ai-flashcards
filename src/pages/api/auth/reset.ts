import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "@/db/supabase.client.ts";
import { resetRequestSchema } from "@/lib/validation/authSchemas.ts";

export const prerender = false;

const jsonHeaders = { "Content-Type": "application/json" };
const SUCCESS_MESSAGE = "Jeśli konto istnieje, wysłaliśmy link do resetu hasła.";
const INVALID_BODY_MESSAGE = "Nieprawidłowe dane wejściowe.";

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: INVALID_BODY_MESSAGE }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const parsed = resetRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: INVALID_BODY_MESSAGE }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });
  const origin = new URL(request.url).origin;
  const configuredBase = import.meta.env.PUBLIC_APP_URL?.replace(/\/$/, "");
  const redirectBase = configuredBase || origin;

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${redirectBase}/auth/reset/confirm`,
  });

  if (error) {
    console.error("Reset password email request failed", error);
  }

  return new Response(JSON.stringify({ message: SUCCESS_MESSAGE }), {
    status: 200,
    headers: jsonHeaders,
  });
};
