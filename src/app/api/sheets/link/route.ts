/**
 * POST /api/sheets/link
 * Vincula una hoja existente o crea una nueva en el Google Drive del usuario.
 *
 * Body:
 * - { formId: string, action: "unlink" }
 * - { formId: string, action: "create" }
 * - { formId: string, action: "link_existing", spreadsheetId: string }
 *
 * Requiere que el usuario esté autenticado en Supabase y tenga Google Drive conectado.
 */
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getSheetsClientForUser,
  getDriveClientForUser,
  isGoogleConfigured,
} from "@/lib/sheets/google";
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

interface FormRow {
  id: string;
  title: string;
  description: string | null;
  spreadsheet_id: string | null;
  status: string;
  [key: string]: unknown;
}

interface SectionRow {
  id: string;
  form_id: string;
  position: number;
  title: string;
  description: string | null;
  next_section: string | null;
}

interface QuestionRow {
  id: string;
  form_id: string;
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

/** Recupera el formulario completo con secciones y preguntas. */
async function loadForm(supabase: ReturnType<typeof supabaseWithToken>, formId: string) {
  const { data, error: formErr } = await supabase
    .from("forms")
    .select("*")
    .eq("id", formId)
    .single();
  if (formErr || !data) return null;
  const form = data as FormRow;

  const [sections, questions] = await Promise.all([
    supabase.from("sections").select("*").eq("form_id", formId),
    supabase.from("questions").select("*").eq("form_id", formId),
  ]);

  const sectionRows = (sections.data ?? []) as SectionRow[];
  const questionRows = (questions.data ?? []) as QuestionRow[];

  const questionsBySection = new Map<string, QuestionRow[]>();
  for (const q of questionRows) {
    const list = questionsBySection.get(q.section_id) ?? [];
    list.push(q);
    questionsBySection.set(q.section_id, list);
  }

  return {
    ...form,
    title: form.title,
    sections: sectionRows
      .sort((a, b) => a.position - b.position)
      .map((s) => ({
        id: s.id,
        title: s.title,
        questions: (questionsBySection.get(s.id) ?? [])
          .sort((a, b) => a.position - b.position)
          .map(rowToQuestion),
      })),
  };
}

export async function POST(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return Response.json(
      { error: "Google no está configurado en el servidor." },
      { status: 503 },
    );
  }

  const token = extractToken(request);
  if (!token) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as {
    formId?: string;
    action: "create" | "link_existing" | "unlink" | "disconnect_google";
    spreadsheetId?: string;
  };
  const { formId, action, spreadsheetId } = body;
  if (!action) {
    return Response.json({ error: "Falta action." }, { status: 400 });
  }

  const supabase = supabaseWithToken(token);

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return Response.json({ error: "Sesión inválida." }, { status: 401 });
  }

  if (action === "disconnect_google") {
    const { error: delErr } = await supabase
      .from("user_google_tokens")
      .delete()
      .eq("user_id", authData.user.id);
    if (delErr) return Response.json({ error: delErr.message }, { status: 500 });
    return Response.json({ ok: true });
  }

  if (!formId) {
    return Response.json({ error: "Falta formId." }, { status: 400 });
  }

  if (action === "unlink") {
    const { error } = await supabase
      .from("forms")
      .update({ spreadsheet_id: null, updated_at: new Date().toISOString() })
      .eq("id", formId);
    if (error) return Response.json({ error: error.message }, { status: 400 });
    return Response.json({ ok: true });
  }

  // Buscar tokens de Google del usuario
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

  const form = await loadForm(supabase, formId);
  if (!form) {
    return Response.json({ error: "Formulario no encontrado." }, { status: 404 });
  }

  const allQuestions = form.sections.flatMap((s) => s.questions);
  const headers = ["Marca temporal", "Correo", ...allQuestions.map((q) => q.title)];

  const sheets = getSheetsClientForUser(tokenRow.refresh_token);

  if (action === "link_existing") {
    if (!spreadsheetId) {
      return Response.json({ error: "Falta spreadsheetId." }, { status: 400 });
    }

    try {
      const existing = await sheets.spreadsheets.get({ spreadsheetId });
      const url =
        existing.data.spreadsheetUrl ||
        `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

      // Asegurar fila de encabezados si está vacía
      try {
        const check = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: "A1:Z1",
        });
        if (!check.data.values || check.data.values.length === 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: "A1",
            valueInputOption: "RAW",
            requestBody: { values: [headers] },
          });
        }
      } catch {
        // Si no se pueden escribir encabezados, se continúa
      }

      const { error: updateErr } = await supabase
        .from("forms")
        .update({
          spreadsheet_id: spreadsheetId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", formId);

      if (updateErr) {
        return Response.json({ error: updateErr.message }, { status: 500 });
      }

      return Response.json({ ok: true, spreadsheetId, url });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error vinculando hoja existente";
      return Response.json({ error: msg }, { status: 400 });
    }
  }

  // action === "create"
  try {
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: `${form.title} (Respuestas)` },
        sheets: [
          {
            properties: { title: "Respuestas", index: 0 },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: headers.map((h: string) => ({
                      userEnteredValue: { stringValue: h },
                      userEnteredFormat: { textFormat: { bold: true } },
                    })),
                  },
                ],
              },
            ],
          },
        ],
      },
    });

    const newSpreadsheetId = spreadsheet.data.spreadsheetId!;
    const url =
      spreadsheet.data.spreadsheetUrl ||
      `https://docs.google.com/spreadsheets/d/${newSpreadsheetId}`;

    const { error: dbErr } = await supabase
      .from("forms")
      .update({
        spreadsheet_id: newSpreadsheetId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", formId);

    if (dbErr) {
      return Response.json({ error: dbErr.message }, { status: 500 });
    }

    // Volcado de respuestas existentes (si ya había respuestas recolectadas antes de vincular)
    try {
      const { data: existingResponses } = await supabase
        .from("responses")
        .select("submitted_at, respondent_email, answers")
        .eq("form_id", formId)
        .order("submitted_at", { ascending: true });

      if (existingResponses && existingResponses.length > 0) {
        const rows = existingResponses.map((r) => {
          const timestamp = r.submitted_at
            ? new Date(r.submitted_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })
            : new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" });
          const ans = (r.answers as Record<string, AnswerValue>) || {};
          return [
            timestamp,
            r.respondent_email ?? "",
            ...allQuestions.map((q) => answerToText(q, ans[q.id] ?? null)),
          ];
        });

        await sheets.spreadsheets.values.append({
          spreadsheetId: newSpreadsheetId,
          range: "Respuestas!A:A",
          valueInputOption: "USER_ENTERED",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values: rows },
        });
      }
    } catch (backfillErr) {
      console.warn("No se pudieron volcar respuestas existentes:", backfillErr);
    }

    return Response.json({ ok: true, spreadsheetId: newSpreadsheetId, url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error creando hoja en Drive";
    console.error("Error en spreadsheets.create:", err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
