/**
 * POST /api/sheets/sync-all
 * Sincroniza todas las respuestas existentes y encabezados a la hoja de Google Sheets.
 *
 * Body: { formId: string }
 * Requiere autorización (el usuario debe ser dueño del formulario).
 */
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSheetsClientForUser, isGoogleConfigured } from "@/lib/sheets/google";
import { answerToText } from "@/lib/format";
import type { AnswerValue, Question } from "@/lib/types";

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
  type: string;
  title: string;
  description: string | null;
  show_description: boolean;
  required: boolean;
  config: Record<string, unknown>;
  points: number | null;
  answer_key: string[] | null;
  feedback: unknown;
  go_to_section: Record<string, string> | null;
}

interface ResponseRow {
  id: string;
  form_id: string;
  submitted_at: string;
  respondent_email: string | null;
  answers: Record<string, AnswerValue>;
}

function rowToQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    type: row.type as Question["type"],
    title: row.title,
    description: row.description ?? "",
    showDescription: row.show_description,
    required: row.required,
    ...(row.config as Partial<Question>),
    points: row.points ?? undefined,
    answerKey: row.answer_key ?? undefined,
    feedback: (row.feedback as Question["feedback"]) ?? undefined,
    goToSection: row.go_to_section ?? undefined,
  };
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
    return Response.json({ error: "Cuenta de Google no vinculada." }, { status: 400 });
  }

  const { data: form } = await supabase
    .from("forms")
    .select("id, spreadsheet_id")
    .eq("id", body.formId)
    .single();

  if (!form || !form.spreadsheet_id) {
    return Response.json({ error: "No hay hoja de cálculo vinculada a este formulario." }, { status: 400 });
  }

  const [sectionsRes, questionsRes, responsesRes] = await Promise.all([
    supabase.from("sections").select("id, position").eq("form_id", body.formId),
    supabase.from("questions").select("*").eq("form_id", body.formId),
    supabase.from("responses").select("*").eq("form_id", body.formId).order("submitted_at", { ascending: true }),
  ]);

  const sections = ((sectionsRes.data ?? []) as SectionRow[]).sort(
    (a, b) => a.position - b.position,
  );
  const allQuestions = ((questionsRes.data ?? []) as QuestionRow[]).sort(
    (a, b) => a.position - b.position,
  );

  const ordered: Question[] = [];
  for (const section of sections) {
    for (const q of allQuestions) {
      if (q.section_id === section.id) ordered.push(rowToQuestion(q));
    }
  }

  const headers = ["Marca temporal", "Correo", ...ordered.map((q) => q.title)];

  const responses = (responsesRes.data ?? []) as ResponseRow[];
  const rows = responses.map((res) => {
    const timestamp = res.submitted_at
      ? new Date(res.submitted_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })
      : "";
    return [
      timestamp,
      res.respondent_email ?? "",
      ...ordered.map((q) => answerToText(q, res.answers?.[q.id] ?? null)),
    ];
  });

  const fullData = [headers, ...rows];

  try {
    const sheets = getSheetsClientForUser(tokenRow.refresh_token);

    // Intentar escribir en la pestaña "Respuestas" o en la primera hoja
    try {
      await sheets.spreadsheets.values.update({
        spreadsheetId: form.spreadsheet_id,
        range: "Respuestas!A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: fullData },
      });
    } catch {
      await sheets.spreadsheets.values.update({
        spreadsheetId: form.spreadsheet_id,
        range: "A1",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: fullData },
      });
    }

    return Response.json({ ok: true, count: rows.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al sincronizar las respuestas.";
    console.error("[sheets/sync-all]", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
