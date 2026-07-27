import { createClient } from "@supabase/supabase-js";

// Public client — safe for the browser, used for reads (draft board, ladder, player list).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Server-side client with the service role key — used only inside API routes / server actions
// for writes that need to bypass RLS (pick submission, vote entry), after PIN verification.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
