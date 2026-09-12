import { uid } from "../id";
import { templateByKey } from "../templates";
import { CHOICE_TYPES, GRID_TYPES, type AnswerValue, type FormDoc, type ResponseDoc } from "../types";

/**
 * Contenido inicial para el modo mock: dos formularios ya publicados con
 * respuestas, para que el panel de respuestas no arranque vacio.
 */
export function seedForms(ownerId: string): FormDoc[] {
  const inscripcion = templateByKey("inscripcion").build(ownerId);
  inscripcion.id = "form_demo_inscripcion";
  inscripcion.title = "Inscripcion al taller de robotica";
  inscripcion.description = "Sabado 4 de octubre, 9:00 a.m. Cupo para 40 personas.";
  inscripcion.status = "published";
  inscripcion.settings.collectEmail = true;
  inscripcion.settings.showProgressBar = true;

  const autorizacion = templateByKey("autorizacion").build(ownerId);
  autorizacion.id = "form_demo_autorizacion";
  autorizacion.title = "Autorizacion salida al Museo del Oro";
  autorizacion.status = "published";

  const encuesta = templateByKey("blank").build(ownerId);
  encuesta.id = "form_demo_borrador";
  encuesta.title = "Encuesta de clima laboral 2026";
  encuesta.description = "Borrador en construccion.";

  return [inscripcion, autorizacion, encuesta];
}

const NOMBRES = [
  "Camila Restrepo",
  "Juan Esteban Ruiz",
  "Valentina Ochoa",
  "Mateo Gil",
  "Sara Jaramillo",
  "Andres Felipe Mesa",
  "Laura Quintero",
  "Nicolas Arango",
  "Manuela Vasquez",
  "Santiago Berrio",
  "Isabella Marin",
  "Tomas Cardona",
];

const ORGANIZACIONES = ["Colegio San Jose", "Universidad Central", "Independiente", "Fundacion Norte"];

/** Generador pseudoaleatorio con semilla, para que los datos no cambien en cada recarga. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

function signatureSvg(name: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="110"><path d="M14 82 C 60 20, 92 96, 132 54 S 208 16, 246 74" fill="none" stroke="#1F1B2E" stroke-width="2.5" stroke-linecap="round"/><text x="16" y="102" font-family="Inter,sans-serif" font-size="10" fill="#8A8699">${name}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function seedResponses(form: FormDoc): ResponseDoc[] {
  if (form.status !== "published") return [];
  const random = seeded(form.id.length * 7919);
  const total = form.id === "form_demo_inscripcion" ? 12 : 6;
  const responses: ResponseDoc[] = [];

  for (let i = 0; i < total; i++) {
    const nombre = NOMBRES[i % NOMBRES.length];
    const answers: Record<string, AnswerValue> = {};

    for (const section of form.sections) {
      for (const q of section.questions) {
        const title = q.title.toLowerCase();

        if (q.type === "signature") {
          answers[q.id] = {
            imageUrl: signatureSvg(nombre),
            typedName: nombre,
            consent: true,
            signedAt: new Date(Date.now() - i * 3_600_000).toISOString(),
            hash: `${form.id}-${i}`.padEnd(64, "0").slice(0, 64),
            userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            method: "drawn",
          };
          continue;
        }

        if (CHOICE_TYPES.includes(q.type) && q.options?.length) {
          const pick = q.options[Math.floor(random() * q.options.length)];
          answers[q.id] = q.type === "checkboxes" ? [pick.label] : pick.label;
          continue;
        }

        if (GRID_TYPES.includes(q.type)) {
          const grid: Record<string, string | string[]> = {};
          for (const row of q.rows ?? []) {
            const col = (q.columns ?? [])[Math.floor(random() * (q.columns?.length || 1))];
            if (col) grid[row.id] = q.type === "grid_checkbox" ? [col.label] : col.label;
          }
          answers[q.id] = grid;
          continue;
        }

        if (q.type === "linear_scale" && q.scale) {
          const span = q.scale.max - q.scale.min + 1;
          answers[q.id] = String(q.scale.min + Math.floor(random() * span));
          continue;
        }

        if (q.type === "rating" && q.rating) {
          answers[q.id] = String(1 + Math.floor(random() * q.rating.max));
          continue;
        }

        if (q.type === "date") {
          answers[q.id] = new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10);
          continue;
        }
        if (q.type === "time") {
          answers[q.id] = `${8 + (i % 8)}:${i % 2 ? "30" : "00"}`;
          continue;
        }
        if (q.type === "file_upload") {
          answers[q.id] = [];
          continue;
        }

        if (title.includes("nombre") && title.includes("estudiante")) answers[q.id] = nombre.split(" ")[0] + " Lopez";
        else if (title.includes("nombre")) answers[q.id] = nombre;
        else if (title.includes("correo"))
          answers[q.id] = `${nombre.split(" ")[0].toLowerCase()}@ejemplo.com`;
        else if (title.includes("telefono")) answers[q.id] = `30${i}4567${i}80`;
        else if (title.includes("organizacion"))
          answers[q.id] = ORGANIZACIONES[i % ORGANIZACIONES.length];
        else if (title.includes("curso")) answers[q.id] = `${5 + (i % 4)}B`;
        else if (title.includes("documento")) answers[q.id] = `10${i}45678${i}`;
        else if (q.type === "paragraph") answers[q.id] = i % 3 === 0 ? "Sin novedades." : "";
        else answers[q.id] = "";
      }
    }

    responses.push({
      id: uid("res"),
      formId: form.id,
      submittedAt: new Date(Date.now() - i * 5_400_000).toISOString(),
      respondentEmail: form.settings.collectEmail
        ? `${nombre.split(" ")[0].toLowerCase()}@ejemplo.com`
        : undefined,
      answers,
    });
  }
  return responses;
}
