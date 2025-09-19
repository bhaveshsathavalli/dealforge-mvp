import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,      // must be defined
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!  // must be defined
);
