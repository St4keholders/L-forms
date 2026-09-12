import { answerToText } from "./format";
import type { FormDoc, ResponseDoc } from "./types";

function escape(value: string): string {
  const needsQuotes = /[",\n;]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

/** Genera el CSV de respuestas con una columna por pregunta. */
export function responsesToCsv(form: FormDoc, responses: ResponseDoc[]): string {
  const questions = form.sections.flatMap((s) => s.questions);
  const header = [
    "Marca temporal",
    ...(form.settings.collectEmail ? ["Correo electronico"] : []),
    ...questions.map((q) => q.title),
    ...(form.settings.isQuiz ? ["Puntuacion"] : []),
  ];

  const rows = responses.map((response) => [
    new Date(response.submittedAt).toLocaleString("es-CO"),
    ...(form.settings.collectEmail ? [response.respondentEmail ?? ""] : []),
    ...questions.map((q) => answerToText(q, response.answers[q.id] ?? null)),
    ...(form.settings.isQuiz ? [`${response.score ?? 0} / ${response.totalPoints ?? 0}`] : []),
  ]);

  return [header, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}

/** Descarga un texto como archivo desde el navegador. */
export function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([`\ufeff${content}`], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
