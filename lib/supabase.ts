import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — the client is only actually constructed the first time it's used,
// not at import time. This stops Next.js's build-time route analysis from crashing
// on routes that don't even need Supabase yet.
let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

// Public client — safe for the browser, used for reads (draft board, ladder, player list).
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getClient() as any)[prop];
  },
});

// Server-side client with the service role key — used only inside API routes / server actions
// for writes that need to bypass RLS (pick submission, vote entry), after PIN verification.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
