import { createClient } from "@supabase/supabase-js";

/**
 * Browser-only Supabase client.
 * Uses NEXT_PUBLIC_* envs.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
