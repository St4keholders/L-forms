import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Cliente de navegador. Usa la anon key: toda la proteccion real vive en las
 * politicas RLS definidas en supabase/migrations.
 */
export function getSupabase(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa tu .env.local.",
    );
  }
  cached = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } });
  return cached;
}

export const STORAGE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET || "l-forms";
