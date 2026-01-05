import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "@/db/supabase.client.ts";
import { loginSchema } from "@/lib/validation/authSchemas.ts";

export const prerender = false;

const jsonHeaders = { "Content-Type": "application/json" };
const GENERIC_ERROR = "Nie udało się zalogować. Sprawdź dane i spróbuj ponownie.";

export const POST: APIRoute = async ({ request, cookies }) => {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Nieprawidłowe dane wejściowe." }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Nieprawidłowe dane logowania." }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: GENERIC_ERROR }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  return new Response(
    JSON.stringify({
      user: {
        id: data.user.id,
        email: data.user.email,
      },
    }),
    {
      status: 200,
      headers: jsonHeaders,
    }
  );
};
