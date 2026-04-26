import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — évite l'erreur "supabaseUrl is required" au build
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

// Alias pour la compatibilité dans les composants client
export const supabase = {
  auth: {
    signInWithPassword: (creds: { email: string; password: string }) =>
      getSupabase().auth.signInWithPassword(creds),
    signOut: () => getSupabase().auth.signOut(),
    getSession: () => getSupabase().auth.getSession(),
  },
  storage: {
    from: (bucket: string) => getSupabase().storage.from(bucket),
  },
};

// Client admin (server-side only, service role)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
