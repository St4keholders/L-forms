/**
 * POST /api/sheets/append
 * Añade una fila a la hoja de cálculo vinculada al formulario.
 *
 * Body: { formId: string, answers: Record<string, unknown>, submittedAt: string, respondentEmail?: string }
 *
 * No requiere autenticacion porque los encuestados pueden ser anonimos.
 * Usa la funcion RPC get_form_sheet_credentials para obtener el spreadsheet_id
 * y el refresh_token del creador del formulario.
 */
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSheetsClientForUser, isGoogleConfigured } from "@/lib/sheets/google";
import { answerToText } from "@/lib/format";
import type { AnswerValue, Question } from "@/lib/types";

export const dynamic = "force-dynamic";

function supabaseClient(token?: string | null) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : undefined,
  );
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

interface SectionRow {
  id: string;
  position: number;
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

  const body = (await request.json()) as {
    formId: string;
    answers: Record<string, AnswerValue>;
    submittedAt: string;
    respondentEmail?: string;
    questions?: Question[];
  };

  const { formId, answers, submittedAt, respondentEmail, questions: clientQuestions } = body;
  if (!formId || !answers) {
    return Response.json({ error: "Faltan formId o answers." }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const supabase = supabaseClient(token);

  // Obtener credenciales del creador del formulario
  const { data: creds, error: credErr } = await supabase.rpc(
    "get_form_sheet_credentials",
    { p_form_id: formId },
  );

  if (credErr || !creds || creds.length === 0) {
    return Response.json({ ok: true, skipped: true });
  }

  const { spreadsheet_id: spreadsheetId, refresh_token: refreshToken } = creds[0];
  if (!spreadsheetId || !refreshToken) {
    return Response.json({ ok: true, skipped: true });
  }

  // Si el cliente nos envía la lista de preguntas, la usamos directamente;
  // de lo contrario, consultamos las secciones y preguntas en la base de datos.
  let ordered: Question[] = [];
  if (Array.isArray(clientQuestions) && clientQuestions.length > 0) {
    ordered = clientQuestions;
  } else {
    const [sectionsRes, questionsRes] = await Promise.all([
      supabase.from("sections").select("id, position").eq("form_id", formId),
      supabase.from("questions").select("*").eq("form_id", formId),
    ]);

    const sections = ((sectionsRes.data ?? []) as SectionRow[]).sort(
      (a, b) => a.position - b.position,
    );
    const allQuestions = ((questionsRes.data ?? []) as QuestionRow[]).sort(
      (a, b) => a.position - b.position,
    );

    for (const section of sections) {
      for (const q of allQuestions) {
        if (q.section_id === section.id) ordered.push(rowToQuestion(q));
      }
    }
  }

  // Construir la fila
  const timestamp = submittedAt
    ? new Date(submittedAt).toLocaleString("es-CO", { timeZone: "America/Bogota" })
    : new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });

  const row = [
    timestamp,
    respondentEmail ?? "",
    ...ordered.map((q) => answerToText(q, answers[q.id] ?? null)),
  ];

  try {
    const sheets = getSheetsClientForUser(refreshToken);
    // Intentar escribir en la pestaña "Respuestas" o por defecto en la primera hoja
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Respuestas!A:A",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [row] },
      });
    } catch {
      // Fallback a A:A general si no existe la pestaña "Respuestas"
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "A:A",
        valueInputOption: "USER_ENTERED",
        insertDataOption: "INSERT_ROWS",
        requestBody: { values: [row] },
      });
    }

    return Response.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al escribir en la hoja.";
    console.error("[sheets/append]", message);
    return Response.json({ ok: false, error: message });
  }
}
