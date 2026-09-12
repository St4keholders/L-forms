import { uid } from "./id";
import type {
  FormDoc,
  FormSettings,
  FormTheme,
  Question,
  QuestionType,
  Section,
} from "./types";

export const DEFAULT_THEME: FormTheme = {
  primaryColor: "#0071E3",
  backgroundColor: "#F5F5F7",
  font: "sf-pro",
  cardStyle: "apple-clean",
  borderRadius: "lg",
  backgroundPattern: "none",
  buttonShape: "pill",
};

export const DEFAULT_SETTINGS: FormSettings = {
  isQuiz: false,
  quiz: {
    releaseGrades: "immediately",
    showMissed: true,
    showCorrect: true,
    showPoints: true,
  },
  collectEmail: false,
  limitOneResponse: false,
  allowEdit: false,
  showSummary: false,
  showProgressBar: false,
  shuffleQuestions: false,
  confirmationMessage: "Se ha registrado tu respuesta.",
  showAnotherResponseLink: true,
  defaultRequired: false,
};

export function makeOption(label: string, isOther = false) {
  return { id: uid("opt"), label, ...(isOther ? { isOther: true } : {}) };
}

/** Crea una pregunta con la forma correcta para su tipo. */
export function makeQuestion(type: QuestionType = "multiple_choice", required = false): Question {
  const base: Question = { id: uid("q"), type, title: "Pregunta sin titulo", required };

  switch (type) {
    case "multiple_choice":
    case "checkboxes":
    case "dropdown":
      return { ...base, options: [makeOption("Opcion 1")] };
    case "grid_multiple_choice":
    case "grid_checkbox":
      return {
        ...base,
        rows: [makeOption("Fila 1")],
        columns: [makeOption("Columna 1")],
      };
    case "linear_scale":
      return { ...base, scale: { min: 1, max: 5, minLabel: "", maxLabel: "" } };
    case "rating":
      return { ...base, rating: { max: 5, icon: "star" } };
    case "file_upload":
      return { ...base, fileUpload: { maxFiles: 1, maxSizeMb: 10, accept: "*/*" } };
    case "signature":
      return {
        ...base,
        title: "Firma",
        signature: {
          requireTypedName: true,
          requireConsent: true,
          consentText:
            "Declaro que he leido el contenido de este formulario y firmo de forma libre y voluntaria.",
          allowUpload: true,
          certificate: true,
        },
      };
    default:
      return base;
  }
}

export function makeSection(title = "Seccion sin titulo"): Section {
  return { id: uid("sec"), title, description: "", questions: [] };
}

export function makeBlankForm(ownerId: string): FormDoc {
  const now = new Date().toISOString();
  const section = makeSection("Seccion 1");
  section.questions = [makeQuestion("multiple_choice")];
  return {
    id: uid("form"),
    ownerId,
    title: "Formulario sin titulo",
    description: "",
    sections: [section],
    theme: { ...DEFAULT_THEME },
    settings: { ...DEFAULT_SETTINGS, quiz: { ...DEFAULT_SETTINGS.quiz } },
    status: "draft",
    spreadsheetId: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Recorre todas las preguntas del formulario en orden de aparicion. */
export function allQuestions(form: FormDoc): Question[] {
  return form.sections.flatMap((s) => s.questions);
}

export function findQuestion(form: FormDoc, questionId: string): Question | undefined {
  return allQuestions(form).find((q) => q.id === questionId);
}
