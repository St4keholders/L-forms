import { DEFAULT_SETTINGS, DEFAULT_THEME, makeOption, makeQuestion, makeSection } from "./defaults";
import { uid } from "./id";
import type { FormDoc, Question, QuestionType, Section } from "./types";

interface QuestionSpec {
  type: QuestionType;
  title: string;
  description?: string;
  required?: boolean;
  options?: string[];
  rows?: string[];
  columns?: string[];
  scale?: { min: number; max: number; minLabel: string; maxLabel: string };
}

function build(spec: QuestionSpec): Question {
  const q = makeQuestion(spec.type, spec.required ?? false);
  q.title = spec.title;
  if (spec.description) {
    q.description = spec.description;
    q.showDescription = true;
  }
  if (spec.options) q.options = spec.options.map((label) => makeOption(label));
  if (spec.rows) q.rows = spec.rows.map((label) => makeOption(label));
  if (spec.columns) q.columns = spec.columns.map((label) => makeOption(label));
  if (spec.scale) q.scale = spec.scale;
  return q;
}

function section(title: string, specs: QuestionSpec[], description?: string): Section {
  const s = makeSection(title);
  if (description) s.description = description;
  s.questions = specs.map(build);
  return s;
}

export interface FormTemplate {
  key: string;
  name: string;
  /** Texto corto que describe para que sirve la plantilla. */
  tagline: string;
  /** Color del lomo de la tarjeta en la galeria. */
  accent: string;
  build: (ownerId: string) => FormDoc;
}

function compose(
  ownerId: string,
  title: string,
  description: string,
  sections: Section[],
  primaryColor = DEFAULT_THEME.primaryColor,
): FormDoc {
  const now = new Date().toISOString();
  return {
    id: uid("form"),
    ownerId,
    title,
    description,
    sections,
    theme: { ...DEFAULT_THEME, primaryColor },
    settings: { ...DEFAULT_SETTINGS, quiz: { ...DEFAULT_SETTINGS.quiz } },
    status: "draft",
    spreadsheetId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export const TEMPLATES: FormTemplate[] = [
  {
    key: "blank",
    name: "Formulario en blanco",
    tagline: "Empieza desde cero",
    accent: "#4C3FD9",
    build: (ownerId) => {
      const s = makeSection("Seccion 1");
      s.questions = [makeQuestion("multiple_choice")];
      return compose(ownerId, "Formulario sin titulo", "", [s]);
    },
  },
  {
    key: "contacto",
    name: "Datos de contacto",
    tagline: "Directorio de personas",
    accent: "#2E7D5B",
    build: (ownerId) =>
      compose(
        ownerId,
        "Datos de contacto",
        "Comparte tus datos para mantenernos en contacto.",
        [
          section("Seccion 1", [
            { type: "short_text", title: "Nombre", required: true },
            { type: "short_text", title: "Correo electronico", required: true },
            { type: "short_text", title: "Telefono" },
            { type: "paragraph", title: "Direccion" },
            { type: "short_text", title: "Comentarios" },
          ]),
        ],
        "#2E7D5B",
      ),
  },
  {
    key: "asistencia",
    name: "Confirmacion de asistencia",
    tagline: "Cuenta cabezas antes del evento",
    accent: "#B4573C",
    build: (ownerId) =>
      compose(
        ownerId,
        "Confirmacion de asistencia al evento",
        "Confirma tu asistencia antes del viernes.",
        [
          section("Seccion 1", [
            { type: "short_text", title: "Nombre y apellidos", required: true },
            { type: "short_text", title: "Correo electronico", required: true },
            {
              type: "multiple_choice",
              title: "Puedes asistir?",
              required: true,
              options: ["Si, alli estare", "No puedo asistir"],
            },
            {
              type: "checkboxes",
              title: "A que actividades te apuntas?",
              options: ["Charla de apertura", "Taller practico", "Almuerzo", "Cierre"],
            },
            { type: "paragraph", title: "Indica tus restricciones alimentarias" },
          ]),
        ],
        "#B4573C",
      ),
  },
  {
    key: "fiesta",
    name: "Invitacion a una fiesta",
    tagline: "Organiza una celebracion",
    accent: "#C23E7B",
    build: (ownerId) =>
      compose(
        ownerId,
        "Invitacion a la fiesta",
        "Nos encantaria verte. Confirma antes del sabado.",
        [
          section("Seccion 1", [
            { type: "short_text", title: "Cual es tu nombre?", required: true },
            {
              type: "multiple_choice",
              title: "Puedes asistir?",
              required: true,
              options: ["Si, cuenten conmigo", "No podre ir"],
            },
            { type: "short_text", title: "Cuantas personas seran?" },
            { type: "short_text", title: "Que vas a traer?" },
            { type: "date", title: "A que hora llegas?" },
          ]),
        ],
        "#C23E7B",
      ),
  },
  {
    key: "camisetas",
    name: "Solicitud de encargo de camisetas",
    tagline: "Tallas y cantidades",
    accent: "#4C3FD9",
    build: (ownerId) =>
      compose(
        ownerId,
        "Solicitud de encargo de camisetas",
        "Escribe tus datos y elige la talla antes del cierre del pedido.",
        [
          section("Seccion 1", [
            { type: "short_text", title: "Nombre", required: true },
            { type: "short_text", title: "Correo electronico", required: true },
            {
              type: "multiple_choice",
              title: "Talla de camiseta",
              required: true,
              options: ["XS", "S", "M", "L", "XL", "XXL"],
            },
            { type: "short_text", title: "Cuantas camisetas quieres?" },
            {
              type: "multiple_choice",
              title: "Como prefieres recogerla?",
              options: ["En la oficina", "Envio a domicilio"],
            },
          ]),
        ],
      ),
  },
  {
    key: "inscripcion",
    name: "Inscripcion a un evento",
    tagline: "Registro de participantes",
    accent: "#7A4E2D",
    build: (ownerId) =>
      compose(
        ownerId,
        "Inscripcion a un evento",
        "Reserva tu lugar. El cupo es limitado.",
        [
          section("Seccion 1", [
            { type: "short_text", title: "Nombre", required: true },
            { type: "short_text", title: "Correo electronico", required: true },
            { type: "short_text", title: "Organizacion" },
            {
              type: "dropdown",
              title: "A que sesion asistiras?",
              required: true,
              options: ["Manana", "Tarde", "Jornada completa"],
            },
            {
              type: "linear_scale",
              title: "Que tanto conoces el tema?",
              scale: { min: 1, max: 5, minLabel: "Nada", maxLabel: "Mucho" },
            },
          ]),
        ],
        "#7A4E2D",
      ),
  },
  {
    key: "autorizacion",
    name: "Autorizacion de salida escolar",
    tagline: "Incluye firma electronica",
    accent: "#1F6F8B",
    build: (ownerId) => {
      const s = section(
        "Datos del estudiante",
        [
          { type: "short_text", title: "Nombre del estudiante", required: true },
          { type: "short_text", title: "Curso", required: true },
          { type: "short_text", title: "Nombre del acudiente", required: true },
          { type: "short_text", title: "Telefono de contacto", required: true },
          {
            type: "multiple_choice",
            title: "Autoriza la salida pedagogica del 14 de octubre?",
            required: true,
            options: ["Si, autorizo", "No autorizo"],
          },
          { type: "paragraph", title: "Observaciones medicas o alergias" },
        ],
        "La salida incluye transporte y almuerzo. Lee la informacion antes de firmar.",
      );
      const firma = makeQuestion("signature", true);
      firma.title = "Firma del acudiente";
      firma.signature!.consentText =
        "Como acudiente autorizo la participacion del estudiante en la salida pedagogica y declaro conocer sus condiciones.";
      s.questions.push(firma);
      return compose(ownerId, "Autorizacion de salida escolar", "", [s], "#1F6F8B");
    },
  },
  {
    key: "consentimiento",
    name: "Consentimiento informado",
    tagline: "Incluye firma electronica",
    accent: "#3E4C59",
    build: (ownerId) => {
      const s = section(
        "Consentimiento",
        [
          { type: "short_text", title: "Nombre completo", required: true },
          { type: "short_text", title: "Documento de identidad", required: true },
          { type: "date", title: "Fecha de nacimiento" },
          {
            type: "checkboxes",
            title: "Confirmo que",
            required: true,
            options: [
              "He leido el documento completo",
              "He podido resolver mis dudas",
              "Participo de forma voluntaria",
            ],
          },
          { type: "file_upload", title: "Adjunta tu documento de identidad" },
        ],
        "Lee con calma cada punto. Puedes retirar tu consentimiento cuando quieras.",
      );
      const firma = makeQuestion("signature", true);
      firma.title = "Firma del participante";
      s.questions.push(firma);
      return compose(ownerId, "Consentimiento informado", "", [s], "#3E4C59");
    },
  },
];

export function templateByKey(key: string): FormTemplate {
  return TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[0];
}
