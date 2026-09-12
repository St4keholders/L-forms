import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getDriveClientForUser, isGoogleConfigured } from "@/lib/sheets/google";

export const dynamic = "force-dynamic";

function extractToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return Response.json(
      { error: "Google no esta configurado en el servidor." },
      { status: 503 },
    );
  }

  const token = extractToken(request);
  if (!token) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return Response.json({ error: "Sesion invalida." }, { status: 401 });
  }

  const { data: tokenRow, error: tokenErr } = await supabase
    .from("user_google_tokens")
    .select("refresh_token")
    .eq("user_id", authData.user.id)
    .single();

  if (tokenErr || !tokenRow?.refresh_token) {
    return Response.json(
      { error: "Debes conectar tu cuenta de Google Drive.", needsAuth: true },
      { status: 403 },
    );
  }

  try {
    const drive = getDriveClientForUser(tokenRow.refresh_token);
    const res = await drive.files.list({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: "files(id, name, webViewLink, modifiedTime)",
      orderBy: "modifiedTime desc",
      pageSize: 50,
    });

    return Response.json({
      spreadsheets: (res.data.files ?? []).map((f) => ({
        id: f.id!,
        name: f.name || "Hoja de calculo sin titulo",
        url: f.webViewLink || `https://docs.google.com/spreadsheets/d/${f.id}`,
        modifiedTime: f.modifiedTime,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error listando hojas de Drive";
    console.error("Error en drive.files.list:", err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
