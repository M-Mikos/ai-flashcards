import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types.ts";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_KEY environment variable");
}

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
export type SupabaseClient = typeof supabaseClient;

export const TEST_USER_ID = "8403a7cd-d430-4deb-a51f-2145f28900b4";
