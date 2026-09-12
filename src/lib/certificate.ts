import { jsPDF } from "jspdf";
import { formatDate } from "./format";
import type { FormDoc, Question, ResponseDoc, SignatureValue } from "./types";

/**
 * Certificado PDF de una firma electronica simple.
 *
 * Deja constancia de quien firmo, cuando, con que dispositivo y con que huella
 * del contenido. No es una firma digital certificada: no interviene una entidad
 * de certificacion ni un sello de tiempo cualificado.
 */
export function downloadSignatureCertificate(
  form: FormDoc,
  question: Question,
  response: ResponseDoc,
  signature: SignatureValue,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const width = doc.internal.pageSize.getWidth();
  let y = margin;

  const accent = form.theme.primaryColor;
  const [r, g, b] = hexToRgb(accent);

  doc.setFillColor(r, g, b);
  doc.rect(0, 0, width, 8, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Certificado de firma electronica", margin, (y += 34));

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(95, 91, 113);
  doc.text("Generado por L-Forms", margin, (y += 16));
  doc.setTextColor(31, 27, 46);

  y += 22;
  doc.setDrawColor(221, 217, 238);
  doc.line(margin, y, width - margin, y);

  const rows: [string, string][] = [
    ["Formulario", form.title],
    ["Pregunta", question.title],
    ["Firmante", signature.typedName || "No indicado"],
    ["Correo declarado", response.respondentEmail ?? "No recogido"],
    ["Fecha de la firma", formatDate(signature.signedAt)],
    ["Metodo", signature.method === "drawn" ? "Trazo dibujado" : "Imagen subida"],
    ["Declaracion aceptada", signature.consent ? "Si" : "No"],
    ["Identificador de respuesta", response.id],
    ["Dispositivo", truncate(signature.userAgent, 70)],
  ];

  y += 24;
  doc.setFontSize(11);
  for (const [label, value] of rows) {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 165, y, { maxWidth: width - margin * 2 - 165 });
    y += 22;
  }

  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Huella del contenido firmado (SHA-256)", margin, y);
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  y += 16;
  doc.text(chunk(signature.hash, 64), margin, y, { maxWidth: width - margin * 2 });

  y += 34;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Firma", margin, y);

  y += 12;
  if (signature.imageUrl.startsWith("data:image/png")) {
    doc.addImage(signature.imageUrl, "PNG", margin, y, 220, 76);
    y += 86;
  } else if (signature.imageUrl.startsWith("data:image/jpeg")) {
    doc.addImage(signature.imageUrl, "JPEG", margin, y, 220, 76);
    y += 86;
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(138, 134, 153);
    doc.text("La imagen de la firma no se pudo incrustar en el PDF.", margin, (y += 14));
    doc.setTextColor(31, 27, 46);
    y += 18;
  }

  doc.setDrawColor(221, 217, 238);
  doc.line(margin, y, margin + 220, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(138, 134, 153);
  doc.text(
    "Este documento acredita una firma electronica simple. No sustituye a una firma digital emitida por una entidad de certificacion.",
    margin,
    doc.internal.pageSize.getHeight() - 44,
    { maxWidth: width - margin * 2 },
  );

  const safeName = (signature.typedName || "firma").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  doc.save(`certificado-${safeName.toLowerCase()}.pdf`);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function chunk(text: string, size: number) {
  return text.match(new RegExp(`.{1,${size}}`, "g"))?.join("\n") ?? text;
}
