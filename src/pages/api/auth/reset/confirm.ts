import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "@/db/supabase.client.ts";
import { resetConfirmSchema } from "@/lib/validation/authSchemas.ts";

export const prerender = false;

const jsonHeaders = { "Content-Type": "application/json" };
const GENERIC_ERROR = "Nie udało się zresetować hasła. Spróbuj ponownie.";
const TOKEN_ERROR = "Brak lub nieprawidłowy token resetu. Poproś o nowy link.";
const INVALID_BODY_MESSAGE = "Nieprawidłowe dane wejściowe.";

export const POST: APIRoute = async ({ request, cookies, url }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: INVALID_BODY_MESSAGE }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const parsed = resetConfirmSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: INVALID_BODY_MESSAGE }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const rawBody = body as Record<string, unknown> | null;
  const bodyToken = typeof rawBody?.token === "string" ? rawBody.token : null;
  const queryToken = url.searchParams.get("access_token") ?? url.searchParams.get("code");
  const token = bodyToken || queryToken;

  if (!token) {
    return new Response(JSON.stringify({ error: TOKEN_ERROR }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(token);
  if (exchangeError) {
    console.error("Failed to exchange reset token", exchangeError);
    return new Response(JSON.stringify({ error: TOKEN_ERROR }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (updateError) {
    console.error("Failed to update password after reset", updateError);
    return new Response(JSON.stringify({ error: GENERIC_ERROR }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  await supabase.auth.signOut();

  return new Response(
    JSON.stringify({
      success: true,
      message: "Hasło zostało zaktualizowane. Zaloguj się ponownie.",
    }),
    {
      status: 200,
      headers: jsonHeaders,
    }
  );
};
