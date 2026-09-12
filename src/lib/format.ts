import { GRID_TYPES, type AnswerValue, type Question, type SignatureValue, type UploadedFile } from "./types";

/** Convierte cualquier respuesta a texto legible, para tablas, CSV y resumenes. */
export function answerToText(question: Question, value: AnswerValue): string {
  if (value === null || value === undefined) return "";

  if (question.type === "signature") {
    const sig = value as SignatureValue;
    if (!sig.imageUrl) return "";
    const fecha = new Date(sig.signedAt).toLocaleString("es-CO");
    return `Firmado por ${sig.typedName || "sin nombre"} el ${fecha}`;
  }

  if (question.type === "file_upload") {
    return (value as UploadedFile[]).map((f) => f.name).join(", ");
  }

  if (GRID_TYPES.includes(question.type)) {
    const grid = value as Record<string, string | string[]>;
    return (question.rows ?? [])
      .map((row) => {
        const cell = grid[row.id];
        const text = Array.isArray(cell) ? cell.join(" / ") : (cell ?? "");
        return text ? `${row.label}: ${text}` : null;
      })
      .filter(Boolean)
      .join(" · ");
  }

  if (Array.isArray(value)) return (value as string[]).join(", ");
  return String(value);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}
