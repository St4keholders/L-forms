import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import type { FormDoc } from "./types";

/**
 * Genera una imagen Data URL en formato PNG con el código QR para una URL.
 */
export async function generateQrDataUrl(url: string, size = 320): Promise<string> {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    color: {
      dark: "#0F172A",
      light: "#FFFFFF",
    },
    errorCorrectionLevel: "H",
  });
}

/**
 * Genera y descarga un documento PDF de alta calidad listo para imprimir
 * con el código QR, título del formulario, enlace directo e instrucciones.
 */
export async function downloadFormQrPdf(form: FormDoc, url: string) {
  const qrDataUrl = await generateQrDataUrl(url, 700);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  const accentHex = form.theme.primaryColor || "#0071E3";
  const [r, g, b] = hexToRgb(accentHex);

  // Franja superior de acento con el color del tema
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, width, 10, "F");

  // Tarjeta de fondo elegante
  doc.setFillColor(250, 251, 253);
  doc.roundedRect(40, 44, width - 80, height - 88, 20, 20, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(40, 44, width - 80, height - 88, 20, 20, "S");

  let y = 90;

  // Header / Marca
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(r, g, b);
  doc.text("L-FORMS", width / 2, y, { align: "center" });

  // Título del formulario
  y += 32;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  const title = form.title || "Formulario sin título";
  doc.text(title, width / 2, y, { align: "center", maxWidth: width - 140 });

  // Subtítulo e instrucciones
  y += 24;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  doc.text("Escanea el código QR con tu celular para completar y responder", width / 2, y, { align: "center" });

  // Tarjeta contenedora del código QR
  y += 32;
  const qrCardSize = 280;
  const qrCardX = (width - qrCardSize) / 2;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qrCardX, y, qrCardSize, qrCardSize, 16, 16, "F");
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(qrCardX, y, qrCardSize, qrCardSize, 16, 16, "S");

  // Imagen del código QR centrada
  const qrImgSize = 240;
  const qrImgX = (width - qrImgSize) / 2;
  doc.addImage(qrDataUrl, "PNG", qrImgX, y + 20, qrImgSize, qrImgSize);

  // Recuadro del enlace directo debajo del QR
  y += qrCardSize + 36;
  const urlBoxWidth = width - 160;
  const urlBoxX = (width - urlBoxWidth) / 2;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(urlBoxX, y, urlBoxWidth, 34, 10, 10, "F");

  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  doc.text(url, width / 2, y + 21, { align: "center", maxWidth: urlBoxWidth - 24 });

  // Pie de página
  y += 56;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text("Formulario disponible en línea · Respuestas seguras y en tiempo real", width / 2, y, { align: "center" });

  const safeTitle = (form.title || "formulario")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  doc.save(`QR-${safeTitle}.pdf`);
}

/**
 * Descarga el código QR como imagen PNG directamente.
 */
export function downloadQrImage(dataUrl: string, fileName = "formulario-qr.png") {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 113,
    parseInt(clean.slice(4, 6), 16) || 227,
  ];
}
