import {
  CHOICE_TYPES,
  GRID_TYPES,
  NEXT_SECTION,
  SUBMIT_FORM,
  type AnswerValue,
  type FormDoc,
  type Question,
  type SignatureValue,
  type UploadedFile,
} from "./types";

/* ------------------------------------------------------------------ */
/* Respuestas vacias                                                    */
/* ------------------------------------------------------------------ */

export function isBlank(question: Question, value: AnswerValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (question.type === "signature") {
    const sig = value as SignatureValue;
    return !sig.imageUrl;
  }
  if (GRID_TYPES.includes(question.type)) {
    const grid = value as Record<string, string | string[]>;
    return Object.values(grid).every((v) => (Array.isArray(v) ? v.length === 0 : !v));
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Validacion                                                           */
/* ------------------------------------------------------------------ */

/** Devuelve el mensaje de error, o null si la respuesta es valida. */
export function validateAnswer(question: Question, value: AnswerValue): string | null {
  const blank = isBlank(question, value);

  if (question.required && blank) {
    if (question.type === "signature") return "Esta pregunta requiere una firma.";
    return "Esta pregunta es obligatoria.";
  }
  if (blank) return null;

  if (question.type === "signature") {
    const sig = value as SignatureValue;
    const cfg = question.signature;
    if (cfg?.requireTypedName && !sig.typedName.trim())
      return "Escribe tu nombre completo para completar la firma.";
    if (cfg?.requireConsent && !sig.consent)
      return "Debes aceptar la declaracion para poder firmar.";
    return null;
  }

  if (GRID_TYPES.includes(question.type) && question.required) {
    const grid = (value ?? {}) as Record<string, string | string[]>;
    const missing = (question.rows ?? []).some((row) => {
      const cell = grid[row.id];
      return Array.isArray(cell) ? cell.length === 0 : !cell;
    });
    if (missing) return "Responde todas las filas.";
  }

  if (question.type === "file_upload") {
    const files = value as UploadedFile[];
    const cfg = question.fileUpload;
    if (cfg && files.length > cfg.maxFiles)
      return `Puedes subir como maximo ${cfg.maxFiles} archivo(s).`;
    if (cfg) {
      const tooBig = files.find((f) => f.size > cfg.maxSizeMb * 1024 * 1024);
      if (tooBig) return `"${tooBig.name}" supera los ${cfg.maxSizeMb} MB permitidos.`;
    }
    return null;
  }

  const v = question.validation;
  if (!v || v.kind === "none") return null;
  const text = typeof value === "string" ? value : String(value);
  const fallback = v.message?.trim();

  if (v.kind === "number") {
    const num = Number(text);
    if (Number.isNaN(num)) return fallback || "Escribe un numero.";
    const a = Number(v.value);
    const b = Number(v.value2);
    const fails =
      (v.rule === "gt" && !(num > a)) ||
      (v.rule === "gte" && !(num >= a)) ||
      (v.rule === "lt" && !(num < a)) ||
      (v.rule === "lte" && !(num <= a)) ||
      (v.rule === "between" && !(num >= a && num <= b)) ||
      (v.rule === "integer" && !Number.isInteger(num));
    if (fails) return fallback || "El numero no cumple la condicion.";
    return null;
  }

  if (v.kind === "length") {
    const limit = Number(v.value);
    if (v.rule === "max" && text.length > limit)
      return fallback || `Maximo ${limit} caracteres.`;
    if (v.rule === "min" && text.length < limit)
      return fallback || `Minimo ${limit} caracteres.`;
    return null;
  }

  if (v.kind === "regex") {
    if (v.rule === "contains" && !text.includes(v.value))
      return fallback || `El texto debe contener "${v.value}".`;
    if (v.rule === "matches") {
      try {
        if (!new RegExp(v.value).test(text)) return fallback || "El formato no es valido.";
      } catch {
        return null; // expresion invalida escrita por el autor: no bloquea al encuestado
      }
    }
  }
  return null;
}

/** Valida una seccion completa. Devuelve { questionId: mensaje }. */
export function validateSection(
  form: FormDoc,
  sectionId: string,
  answers: Record<string, AnswerValue>,
): Record<string, string> {
  const section = form.sections.find((s) => s.id === sectionId);
  const errors: Record<string, string> = {};
  if (!section) return errors;
  for (const q of section.questions) {
    const error = validateAnswer(q, answers[q.id] ?? null);
    if (error) errors[q.id] = error;
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Logica condicional                                                   */
/* ------------------------------------------------------------------ */

/**
 * Calcula la siguiente seccion tras responder `sectionId`.
 * Prioridad: ruta de la opcion elegida > ruta fija de la seccion > seccion siguiente.
 * Devuelve el id de la seccion, o SUBMIT_FORM si toca enviar.
 */
export function resolveNextSection(
  form: FormDoc,
  sectionId: string,
  answers: Record<string, AnswerValue>,
): string {
  const index = form.sections.findIndex((s) => s.id === sectionId);
  if (index === -1) return SUBMIT_FORM;
  const section = form.sections[index];

  for (const q of section.questions) {
    if (q.type !== "multiple_choice" || !q.goToSection) continue;
    const answer = answers[q.id];
    if (typeof answer !== "string" || !answer) continue;
    const chosen = q.options?.find((o) => o.label === answer || o.id === answer);
    if (!chosen) continue;
    const target = q.goToSection[chosen.id];
    if (!target || target === NEXT_SECTION) continue;
    if (target === SUBMIT_FORM) return SUBMIT_FORM;
    if (form.sections.some((s) => s.id === target)) return target;
  }

  const fixed = section.nextSection;
  if (fixed === SUBMIT_FORM) return SUBMIT_FORM;
  if (fixed && fixed !== NEXT_SECTION && form.sections.some((s) => s.id === fixed)) return fixed;

  const next = form.sections[index + 1];
  return next ? next.id : SUBMIT_FORM;
}

/* ------------------------------------------------------------------ */
/* Modo cuestionario                                                    */
/* ------------------------------------------------------------------ */

function normalize(text: string) {
  return text.trim().toLowerCase();
}

export function isCorrect(question: Question, value: AnswerValue): boolean {
  const key = question.answerKey ?? [];
  if (key.length === 0) return false;

  if (CHOICE_TYPES.includes(question.type)) {
    if (question.type === "checkboxes") {
      const given = (Array.isArray(value) ? value : []) as string[];
      if (given.length !== key.length) return false;
      return key.every((k) => given.some((g) => normalize(g) === normalize(k)));
    }
    return typeof value === "string" && key.some((k) => normalize(k) === normalize(value));
  }

  if (typeof value === "string") return key.some((k) => normalize(k) === normalize(value));
  return false;
}

export function gradeResponse(
  form: FormDoc,
  answers: Record<string, AnswerValue>,
): { score: number; totalPoints: number } {
  let score = 0;
  let totalPoints = 0;
  for (const section of form.sections) {
    for (const q of section.questions) {
      const points = q.points ?? 0;
      if (points <= 0) continue;
      totalPoints += points;
      if (isCorrect(q, answers[q.id] ?? null)) score += points;
    }
  }
  return { score, totalPoints };
}

/* ------------------------------------------------------------------ */
/* Orden aleatorio                                                      */
/* ------------------------------------------------------------------ */

/** Baraja una copia del arreglo (Fisher-Yates). */
export function shuffle<T>(items: T[], seed = Math.random()): T[] {
  const copy = [...items];
  let random = seed;
  const next = () => {
    random = (random * 9301 + 49297) % 233280;
    return random / 233280;
  };
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
