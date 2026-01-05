import type { APIRoute } from "astro";

import { createSupabaseServerInstance } from "@/db/supabase.client.ts";
import { registerSchema } from "@/lib/validation/authSchemas.ts";

export const prerender = false;

const jsonHeaders = { "Content-Type": "application/json" };
const GENERIC_ERROR = "Nie udało się zarejestrować. Spróbuj ponownie.";

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

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "Nieprawidłowe dane rejestracji." }), {
      status: 400,
      headers: jsonHeaders,
    });
  }

  const supabase = createSupabaseServerInstance({ cookies, headers: request.headers });
  const origin = new URL(request.url).origin;

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/login`,
    },
  });

  if (error) {
    const isDuplicate = error.message?.toLowerCase().includes("registered");
    const message = isDuplicate ? "Konto z tym adresem już istnieje." : GENERIC_ERROR;

    return new Response(JSON.stringify({ error: message }), {
      status: isDuplicate ? 409 : 400,
      headers: jsonHeaders,
    });
  }

  return new Response(
    JSON.stringify({
      user: data.user
        ? {
            id: data.user.id,
            email: data.user.email,
          }
        : null,
      emailConfirmationRequired: true,
      message: "Sprawdź skrzynkę i kliknij link, aby aktywować konto.",
    }),
    {
      status: 201,
      headers: jsonHeaders,
    }
  );
};
