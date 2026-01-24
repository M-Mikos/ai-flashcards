import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

async function deleteFlashcardsForTestUser() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY; // anon key
  const email = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  const expectedUserId = process.env.E2E_USERNAME_ID;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("[global-teardown] Missing Supabase config; skipping cleanup.");
    return;
  }

  if (!email || !password) {
    console.warn("[global-teardown] Missing E2E credentials; skipping cleanup.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError || !data.user) {
    console.error("[global-teardown] Sign-in failed", signInError);
    throw signInError ?? new Error("No user returned from sign-in");
  }

  const userId = data.user.id;

  if (expectedUserId && expectedUserId !== userId) {
    throw new Error(
      `[global-teardown] Authenticated user (${userId}) does not match E2E_USERNAME_ID (${expectedUserId})`
    );
  }

  console.info(`[global-teardown] Deleting flashcards for user_id=${userId}`);

  const { data: deleted, error } = await supabase.from("flashcards").delete().eq("user_id", userId).select("id");

  if (error) {
    console.error("[global-teardown] Flashcards cleanup failed", error);
    throw error;
  }

  console.info(`[global-teardown] Flashcards cleanup finished (${deleted?.length ?? 0} rows)`);
}

export default async function globalTeardown() {
  await deleteFlashcardsForTestUser();
}
