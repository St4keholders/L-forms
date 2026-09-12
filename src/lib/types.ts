/**
 * Modelo de datos de L-Forms.
 * Todo el editor, la vista publica y el panel de respuestas trabajan sobre estos tipos.
 */

export type QuestionType =
  | "short_text"
  | "paragraph"
  | "multiple_choice"
  | "checkboxes"
  | "dropdown"
  | "file_upload"
  | "linear_scale"
  | "rating"
  | "grid_multiple_choice"
  | "grid_checkbox"
  | "date"
  | "time"
  | "signature";

export const QUESTION_TYPES: { type: QuestionType; label: string }[] = [
  { type: "short_text", label: "Respuesta corta" },
  { type: "paragraph", label: "Parrafo" },
  { type: "multiple_choice", label: "Opcion multiple" },
  { type: "checkboxes", label: "Casillas" },
  { type: "dropdown", label: "Desplegable" },
  { type: "file_upload", label: "Subida de archivos" },
  { type: "linear_scale", label: "Escala lineal" },
  { type: "rating", label: "Calificacion" },
  { type: "grid_multiple_choice", label: "Cuadricula de opcion multiple" },
  { type: "grid_checkbox", label: "Cuadricula de casillas" },
  { type: "date", label: "Fecha" },
  { type: "time", label: "Hora" },
  { type: "signature", label: "Firma electronica" },
];

/** Tipos que se responden eligiendo entre opciones predefinidas. */
export const CHOICE_TYPES: QuestionType[] = ["multiple_choice", "checkboxes", "dropdown"];
/** Tipos con filas y columnas. */
export const GRID_TYPES: QuestionType[] = ["grid_multiple_choice", "grid_checkbox"];

export interface Option {
  id: string;
  label: string;
  /** Opcion "Otro" con campo de texto libre. */
  isOther?: boolean;
}

export type ValidationKind = "none" | "number" | "length" | "regex";

export interface Validation {
  kind: ValidationKind;
  /** number: gt|gte|lt|lte|between|integer · length: max|min · regex: contains|matches */
  rule: string;
  value: string;
  value2?: string;
  message?: string;
}

export interface SignatureConfig {
  /** Exigir que el firmante escriba su nombre completo. */
  requireTypedName: boolean;
  /** Exigir aceptacion explicita del texto de consentimiento. */
  requireConsent: boolean;
  consentText: string;
  /** Permitir subir una imagen de firma en vez de dibujarla. */
  allowUpload: boolean;
  /** Generar certificado PDF descargable con los metadatos de la firma. */
  certificate: boolean;
}

/** Destino especial de la logica condicional. */
export const NEXT_SECTION = "__next__";
export const SUBMIT_FORM = "__submit__";

export interface Question {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required: boolean;
  showDescription?: boolean;

  options?: Option[];
  rows?: Option[];
  columns?: Option[];

  scale?: { min: number; max: number; minLabel: string; maxLabel: string };
  rating?: { max: number; icon: "star" | "heart" | "thumb" };
  fileUpload?: { maxFiles: number; maxSizeMb: number; accept: string };
  signature?: SignatureConfig;

  shuffleOptions?: boolean;
  validation?: Validation;
  media?: { type: "image" | "video"; url: string };

  /** Modo cuestionario. */
  points?: number;
  answerKey?: string[];
  feedback?: { correct?: string; incorrect?: string };

  /** Logica condicional: id de opcion -> id de seccion | NEXT_SECTION | SUBMIT_FORM */
  goToSection?: Record<string, string>;
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  /** Destino al terminar la seccion si ninguna pregunta define ruta. */
  nextSection?: string;
}

export interface FormTheme {
  primaryColor: string;
  backgroundColor: string;
  font: "sf-pro" | "inter" | "grotesk" | "space-grotesk" | "serif" | "lora" | "mono";
  headerImage?: string;
  /** Estilo de superficie de las tarjetas (Liquid Glass con desenfoque, Minimalista, Metalizado, Relieve Haptico, etc.) */
  cardStyle?: "apple-clean" | "liquid-glass" | "bordered" | "metallic" | "embossed" | "flat" | "bento";
  /** Curvatura de las esquinas (estilo squircle) */
  borderRadius?: "sm" | "md" | "lg" | "full";
  /** Patron o efecto de iluminacion y formas de fondo */
  backgroundPattern?:
    | "none"
    | "mesh"
    | "mesh-gradient"
    | "dots"
    | "subtle-dots"
    | "soft-glow"
    | "aurora-orbs"
    | "floating-shapes"
    | "grid-lines";
  /** Forma de los botones principales */
  buttonShape?: "pill" | "rounded" | "rectangle";
  /** Halo luminoso perimetral de color de acento alrededor de las tarjetas */
  cardGlow?: boolean;
  /** Estilo interactivo de las opciones (tarjetas seleccionables modernas vs clasicas) */
  optionStyle?: "classic" | "card";
}

export interface FormSettings {
  isQuiz: boolean;
  quiz: {
    releaseGrades: "immediately" | "later";
    showMissed: boolean;
    showCorrect: boolean;
    showPoints: boolean;
  };
  collectEmail: boolean;
  limitOneResponse: boolean;
  allowEdit: boolean;
  showSummary: boolean;
  showProgressBar: boolean;
  shuffleQuestions: boolean;
  confirmationMessage: string;
  showAnotherResponseLink: boolean;
  /** Valor por defecto de "obligatoria" para preguntas nuevas. */
  defaultRequired: boolean;
}

export type FormStatus = "draft" | "published";

export interface FormDoc {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  sections: Section[];
  theme: FormTheme;
  settings: FormSettings;
  status: FormStatus;
  /**
   * Id de la hoja de calculo de Drive asociada.
   * Reservado para la integracion con Google Sheets, aun no implementada.
   */
  spreadsheetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedFile {
  name: string;
  url: string;
  size: number;
}

export interface SignatureValue {
  /** Data URL o URL de Storage con el trazo de la firma. */
  imageUrl: string;
  typedName: string;
  consent: boolean;
  signedAt: string;
  /** SHA-256 del contenido firmado, para detectar alteraciones posteriores. */
  hash: string;
  userAgent: string;
  method: "drawn" | "uploaded";
}

export type AnswerValue =
  | string
  | string[]
  | Record<string, string | string[]>
  | UploadedFile[]
  | SignatureValue
  | null;

export interface ResponseDoc {
  id: string;
  formId: string;
  submittedAt: string;
  respondentEmail?: string;
  answers: Record<string, AnswerValue>;
  score?: number;
  totalPoints?: number;
}

export type CollaboratorRole = "editor" | "viewer";

export interface Collaborator {
  formId: string;
  email: string;
  role: CollaboratorRole;
  invitedAt: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
}
