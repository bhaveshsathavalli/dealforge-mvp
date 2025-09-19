import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

/**
 * Server-side Supabase client that uses Clerk authentication.
 * This respects RLS policies and should be used for user-scoped operations.
 */
export async function createAuthenticatedSupabaseClient() {
  const { getToken } = await auth();
  
  if (!getToken) {
    throw new Error("No authentication token available");
  }

  const token = await getToken({ template: "supabase" });
  
  if (!token) {
    throw new Error("No Supabase token available");
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
}

/**
 * Fallback: Server-only Supabase client using service role key.
 * This bypasses RLS and should only be used when RLS is disabled.
 */
export function supabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only service role key
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!
        }
      }
    }
  );
}
