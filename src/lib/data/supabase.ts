import { getSupabase, STORAGE_BUCKET } from "../supabase/client";
import { DataError, type DataSource } from "./types";
import type {
  Collaborator,
  FormDoc,
  Profile,
  Question,
  ResponseDoc,
  Section,
  UploadedFile,
} from "../types";

/* ------------------------------------------------------------------ */
/* Filas de Postgres                                                   */
/* ------------------------------------------------------------------ */

export interface FormRow {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  theme: FormDoc["theme"];
  settings: FormDoc["settings"];
  status: FormDoc["status"];
  spreadsheet_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SectionRow {
  id: string;
  form_id: string;
  position: number;
  title: string;
  description: string | null;
  next_section: string | null;
}

export interface QuestionRow {
  id: string;
  form_id: string;
  section_id: string;
  position: number;
  type: Question["type"];
  title: string;
  description: string | null;
  show_description: boolean;
  required: boolean;
  config: Record<string, unknown>;
  points: number | null;
  answer_key: string[] | null;
  feedback: Question["feedback"] | null;
  go_to_section: Record<string, string> | null;
}

interface ResponseRow {
  id: string;
  form_id: string;
  submitted_at: string;
  respondent_email: string | null;
  answers: ResponseDoc["answers"];
  score: number | null;
  total_points: number | null;
}

interface CollaboratorRow {
  form_id: string;
  email: string;
  role: Collaborator["role"];
  invited_at: string;
}

/* ------------------------------------------------------------------ */
/* Conversion fila <-> modelo                                          */
/* ------------------------------------------------------------------ */

/** Campos de la pregunta que dependen del tipo y viajan juntos en `config`. */
const CONFIG_KEYS = [
  "options",
  "rows",
  "columns",
  "scale",
  "rating",
  "fileUpload",
  "signature",
  "shuffleOptions",
  "validation",
  "media",
] as const;

export function questionToRow(
  question: Question,
  formId: string,
  sectionId: string,
  position: number,
): QuestionRow {
  const config: Record<string, unknown> = {};
  for (const key of CONFIG_KEYS) {
    const value = question[key];
    if (value !== undefined) config[key] = value;
  }
  return {
    id: question.id,
    form_id: formId,
    section_id: sectionId,
    position,
    type: question.type,
    title: question.title,
    description: question.description ?? "",
    show_description: question.showDescription ?? false,
    required: question.required,
    config,
    points: question.points ?? null,
    answer_key: question.answerKey ?? null,
    feedback: question.feedback ?? null,
    go_to_section: question.goToSection ?? null,
  };
}

export function rowToQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description ?? "",
    showDescription: row.show_description,
    required: row.required,
    ...(row.config as Partial<Question>),
    points: row.points ?? undefined,
    answerKey: row.answer_key ?? undefined,
    feedback: row.feedback ?? undefined,
    goToSection: row.go_to_section ?? undefined,
  };
}

export function sectionToRow(section: Section, formId: string, position: number): SectionRow {
  return {
    id: section.id,
    form_id: formId,
    position,
    title: section.title,
    description: section.description ?? "",
    next_section: section.nextSection ?? null,
  };
}

export function formToRow(form: FormDoc): FormRow {
  return {
    id: form.id,
    owner_id: form.ownerId,
    title: form.title,
    description: form.description,
    theme: form.theme,
    settings: form.settings,
    status: form.status,
    spreadsheet_id: form.spreadsheetId,
    created_at: form.createdAt,
    updated_at: new Date().toISOString(),
  };
}

/** Reconstruye los formularios a partir de las tres tablas. */
export function assemble(forms: FormRow[], sections: SectionRow[], questions: QuestionRow[]): FormDoc[] {
  const sectionsByForm = new Map<string, SectionRow[]>();
  for (const section of sections) {
    const list = sectionsByForm.get(section.form_id) ?? [];
    list.push(section);
    sectionsByForm.set(section.form_id, list);
  }

  const questionsBySection = new Map<string, QuestionRow[]>();
  for (const question of questions) {
    const list = questionsBySection.get(question.section_id) ?? [];
    list.push(question);
    questionsBySection.set(question.section_id, list);
  }

  return forms.map((row) => ({
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    description: row.description ?? "",
    sections: (sectionsByForm.get(row.id) ?? [])
      .sort((a, b) => a.position - b.position)
      .map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description ?? "",
        nextSection: section.next_section ?? undefined,
        questions: (questionsBySection.get(section.id) ?? [])
          .sort((a, b) => a.position - b.position)
          .map(rowToQuestion),
      })),
    theme: row.theme,
    settings: row.settings,
    status: row.status,
    spreadsheetId: row.spreadsheet_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

const toResponse = (row: ResponseRow): ResponseDoc => ({
  id: row.id,
  formId: row.form_id,
  submittedAt: row.submitted_at,
  respondentEmail: row.respondent_email ?? undefined,
  answers: row.answers ?? {},
  score: row.score ?? undefined,
  totalPoints: row.total_points ?? undefined,
});

const toCollaborator = (row: CollaboratorRow): Collaborator => ({
  formId: row.form_id,
  email: row.email,
  role: row.role,
  invitedAt: row.invited_at,
});

function fail(message: string, error: { message: string } | null): never {
  throw new DataError(`${message}${error ? `: ${error.message}` : ""}`);
}

/** Lista de ids con el formato que espera el operador `in` de PostgREST. */
function inList(ids: string[]): string {
  return `(${ids.map((id) => `"${id}"`).join(",")})`;
}

/* ------------------------------------------------------------------ */
/* Fuente de datos                                                     */
/* ------------------------------------------------------------------ */

export const supabaseSource: DataSource = {
  name: "supabase",

  async signIn(email, password) {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error || !data.user) fail("No se pudo iniciar sesion", error);
    return {
      id: data.user.id,
      email: data.user.email ?? email,
      name: (data.user.user_metadata?.name as string) ?? email.split("@")[0],
    } satisfies Profile;
  },

  async signUp(email, password, name) {
    const { data, error } = await getSupabase().auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error || !data.user) fail("No se pudo crear la cuenta", error);
    return { id: data.user.id, email: data.user.email ?? email, name } satisfies Profile;
  },

  async signOut() {
    await getSupabase().auth.signOut();
  },

  async getSession() {
    const { data } = await getSupabase().auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    return {
      id: user.id,
      email: user.email ?? "",
      name: (user.user_metadata?.name as string) ?? user.email?.split("@")[0] ?? "",
    } satisfies Profile;
  },

  async listForms(ownerId) {
    const supabase = getSupabase();
    const { data: forms, error } = await supabase
      .from("forms")
      .select("*")
      .eq("owner_id", ownerId)
      .order("updated_at", { ascending: false });
    if (error) fail("No se pudieron cargar los formularios", error);

    const ids = (forms as FormRow[]).map((f) => f.id);
    if (ids.length === 0) return [];

    const [sections, questions] = await Promise.all([
      supabase.from("sections").select("*").in("form_id", ids),
      supabase.from("questions").select("*").in("form_id", ids),
    ]);
    if (sections.error) fail("No se pudieron cargar las secciones", sections.error);
    if (questions.error) fail("No se pudieron cargar las preguntas", questions.error);

    return assemble(
      forms as FormRow[],
      sections.data as SectionRow[],
      questions.data as QuestionRow[],
    );
  },

  async getForm(id) {
    const supabase = getSupabase();
    const { data: form, error } = await supabase
      .from("forms")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) fail("No se pudo abrir el formulario", error);
    if (!form) return null;

    const [sections, questions] = await Promise.all([
      supabase.from("sections").select("*").eq("form_id", id),
      supabase.from("questions").select("*").eq("form_id", id),
    ]);
    if (sections.error) fail("No se pudieron cargar las secciones", sections.error);
    if (questions.error) fail("No se pudieron cargar las preguntas", questions.error);

    return assemble(
      [form as FormRow],
      sections.data as SectionRow[],
      questions.data as QuestionRow[],
    )[0];
  },

  /**
   * Guarda el formulario completo: su fila, sus secciones y sus preguntas,
   * y elimina las que el autor haya quitado en el editor.
   */
  async saveForm(form) {
    const supabase = getSupabase();

    const { error: formError } = await supabase.from("forms").upsert(formToRow(form));
    if (formError) fail("No se pudo guardar el formulario", formError);

    const sectionRows = form.sections.map((section, index) => sectionToRow(section, form.id, index));
    const questionRows = form.sections.flatMap((section) =>
      section.questions.map((question, index) =>
        questionToRow(question, form.id, section.id, index),
      ),
    );

    if (sectionRows.length > 0) {
      const { error } = await supabase.from("sections").upsert(sectionRows);
      if (error) fail("No se pudieron guardar las secciones", error);
    }

    // Al borrar una seccion se van sus preguntas por la clave foranea.
    const sectionCleanup =
      sectionRows.length > 0
        ? await supabase
            .from("sections")
            .delete()
            .eq("form_id", form.id)
            .not("id", "in", inList(sectionRows.map((s) => s.id)))
        : await supabase.from("sections").delete().eq("form_id", form.id);
    if (sectionCleanup.error) fail("No se pudieron limpiar las secciones", sectionCleanup.error);

    if (questionRows.length > 0) {
      const { error } = await supabase.from("questions").upsert(questionRows);
      if (error) fail("No se pudieron guardar las preguntas", error);
    }

    const questionCleanup =
      questionRows.length > 0
        ? await supabase
            .from("questions")
            .delete()
            .eq("form_id", form.id)
            .not("id", "in", inList(questionRows.map((q) => q.id)))
        : await supabase.from("questions").delete().eq("form_id", form.id);
    if (questionCleanup.error) fail("No se pudieron limpiar las preguntas", questionCleanup.error);

    return { ...form, updatedAt: new Date().toISOString() };
  },

  async deleteForm(id) {
    const { error } = await getSupabase().from("forms").delete().eq("id", id);
    if (error) fail("No se pudo eliminar el formulario", error);
  },

  async listResponses(formId) {
    const { data, error } = await getSupabase()
      .from("responses")
      .select("*")
      .eq("form_id", formId)
      .order("submitted_at", { ascending: false });
    if (error) fail("No se pudieron cargar las respuestas", error);
    return (data as ResponseRow[]).map(toResponse);
  },

  async createResponse(response) {
    const { data, error } = await getSupabase()
      .from("responses")
      .insert({
        id: response.id,
        form_id: response.formId,
        submitted_at: response.submittedAt,
        respondent_email: response.respondentEmail ?? null,
        answers: response.answers,
        score: response.score ?? null,
        total_points: response.totalPoints ?? null,
      })
      .select()
      .single();
    if (error) fail("No se pudo enviar la respuesta", error);
    return toResponse(data as ResponseRow);
  },

  async deleteResponses(formId) {
    const { error } = await getSupabase().from("responses").delete().eq("form_id", formId);
    if (error) fail("No se pudieron eliminar las respuestas", error);
  },

  async listCollaborators(formId) {
    const { data, error } = await getSupabase()
      .from("form_collaborators")
      .select("*")
      .eq("form_id", formId)
      .order("invited_at", { ascending: true });
    if (error) fail("No se pudieron cargar los colaboradores", error);
    return (data as CollaboratorRow[]).map(toCollaborator);
  },

  async addCollaborator(formId, email, role) {
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new DataError("Escribe un correo valido.");
    const { data, error } = await getSupabase()
      .from("form_collaborators")
      .insert({ form_id: formId, email: clean, role })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") throw new DataError("Esa persona ya esta invitada.");
      fail("No se pudo invitar a esa persona", error);
    }
    return toCollaborator(data as CollaboratorRow);
  },

  async removeCollaborator(formId, email) {
    const { error } = await getSupabase()
      .from("form_collaborators")
      .delete()
      .eq("form_id", formId)
      .eq("email", email.trim().toLowerCase());
    if (error) fail("No se pudo quitar al colaborador", error);
  },

  async uploadFile(file, folder) {
    const path = `${folder}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    const supabase = getSupabase();
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) fail("No se pudo subir el archivo", error);
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return { name: file.name, url: data.publicUrl, size: file.size } satisfies UploadedFile;
  },
};
