import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isGoogleConfigured } from "@/lib/sheets/google";

export const dynamic = "force-dynamic";

function extractToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return Response.json({ isConfigured: false, isConnected: false });
  }

  const token = extractToken(request);
  if (!token) {
    return Response.json({ isConfigured: true, isConnected: false });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return Response.json({ isConfigured: true, isConnected: false });
  }

  const { data: tokenRow } = await supabase
    .from("user_google_tokens")
    .select("email, updated_at")
    .eq("user_id", authData.user.id)
    .single();

  return Response.json({
    isConfigured: true,
    isConnected: Boolean(tokenRow),
    email: tokenRow?.email || null,
  });
}
