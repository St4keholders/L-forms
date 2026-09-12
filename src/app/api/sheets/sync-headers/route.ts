/**
 * POST /api/sheets/sync-headers
 * Reescribe la fila de encabezados cuando cambian las preguntas del formulario.
 *
 * Body: { formId: string }
 *
 * Requiere autenticacion (el usuario debe ser dueño del formulario).
 */
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSheetsClientForUser, isGoogleConfigured } from "@/lib/sheets/google";

export const dynamic = "force-dynamic";

function supabaseWithToken(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
}

function extractToken(request: NextRequest): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

interface SectionRow {
  id: string;
  position: number;
}

interface QuestionRow {
  id: string;
  section_id: string;
  position: number;
  title: string;
}

export async function POST(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return Response.json({ ok: true, skipped: true });
  }

  const token = extractToken(request);
  if (!token) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as { formId: string };
  if (!body.formId) {
    return Response.json({ error: "Falta formId." }, { status: 400 });
  }

  const supabase = supabaseWithToken(token);

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return Response.json({ error: "Sesión inválida." }, { status: 401 });
  }

  const { data: tokenRow } = await supabase
    .from("user_google_tokens")
    .select("refresh_token")
    .eq("user_id", authData.user.id)
    .single();

  if (!tokenRow?.refresh_token) {
    return Response.json({ ok: true, skipped: true });
  }

  const { data: form } = await supabase
    .from("forms")
    .select("id, spreadsheet_id")
    .eq("id", body.formId)
    .single();

  if (!form || !form.spreadsheet_id) {
    return Response.json({ ok: true, skipped: true });
  }

  const [sectionsRes, questionsRes] = await Promise.all([
    supabase.from("sections").select("id, position").eq("form_id", body.formId),
    supabase.from("questions").select("id, section_id, position, title").eq("form_id", body.formId),
  ]);

  const sections = ((sectionsRes.data ?? []) as SectionRow[]).sort(
    (a, b) => a.position - b.position,
  );
  const allQuestions = ((questionsRes.data ?? []) as QuestionRow[]).sort(
    (a, b) => a.position - b.position,
  );

  const ordered: QuestionRow[] = [];
  for (const section of sections) {
    for (const q of allQuestions) {
      if (q.section_id === section.id) ordered.push(q);
    }
  }

  const headers = ["Marca temporal", "Correo", ...ordered.map((q) => q.title)];

  try {
    const sheets = getSheetsClientForUser(tokenRow.refresh_token);
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: form.spreadsheet_id,
        range: "Respuestas!1:1",
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    } catch {
      await sheets.spreadsheets.values.update({
        spreadsheetId: form.spreadsheet_id,
        range: "1:1",
        valueInputOption: "RAW",
        requestBody: { values: [headers] },
      });
    }

    return Response.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al actualizar los encabezados.";
    console.error("[sheets/sync-headers]", message);
    return Response.json({ ok: false, error: message });
  }
}
