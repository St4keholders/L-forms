"use client";

import { Check, Copy, Download, FileDown, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Modal, Spinner, TextField } from "@/components/ui";
import { downloadFormQrPdf, downloadQrImage, generateQrDataUrl } from "@/lib/qr-pdf";
import { useEditor } from "@/store/editor";

export function ShareDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const form = useEditor((s) => s.form);
  const [copied, setCopied] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  const url = form ? `${origin || "https://l-forms.vercel.app"}/f/${form.id}` : "";

  // Generar preview del código QR cuando se abre el modal
  useEffect(() => {
    if (open && url) {
      void generateQrDataUrl(url, 320).then(setQrUrl);
    }
  }, [open, url]);

  if (!form) return null;

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1800);
  }

  async function handleDownloadPdf() {
    if (!form) return;
    setDownloadingPdf(true);
    try {
      await downloadFormQrPdf(form, url);
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Enviar formulario">
      {form.status !== "published" && (
        <p className="mb-4 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-2.5 text-xs font-medium text-amber-800">
          Este formulario está en borrador. Publícalo para que el enlace acepte respuestas.
        </p>
      )}

      {/* Enlace directo */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-muted uppercase tracking-wider">
          Enlace público para responder
        </label>
        <div className="flex gap-2">
          <TextField readOnly value={url} aria-label="Enlace del formulario" />
          <Button onClick={() => void copy(url, "link")}>
            {copied === "link" ? <Check size={16} /> : <Copy size={16} />}
            {copied === "link" ? "Copiado" : "Copiar"}
          </Button>
        </div>
        <p className="text-xs text-muted">
          Cualquiera con el enlace puede responder mientras el formulario esté publicado.
        </p>
      </div>

      {/* Separador */}
      <div className="my-5 border-t border-line" />

      {/* Sección Generar QR en PDF */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <QrCode size={18} className="text-brand" />
            <span>Código QR del formulario</span>
          </div>
          <span className="text-[11px] font-medium text-muted">Listo para imprimir</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-line bg-surface-raised p-4 transition-all">
          {/* Visualización del código QR */}
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-xl border border-black/[0.08] bg-white p-2 shadow-sm">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="Código QR del formulario"
                className="h-full w-full object-contain rounded-lg"
              />
            ) : (
              <Spinner label="" />
            )}
          </div>

          {/* Información y botones de acción */}
          <div className="flex flex-1 flex-col justify-between space-y-3 text-center sm:text-left">
            <p className="text-xs text-muted leading-relaxed">
              Genera una hoja en PDF con diseño profesional, el título de tu formulario y el código QR de alta resolución listo para imprimir o compartir.
            </p>

            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              <Button
                variant="primary"
                size="sm"
                disabled={downloadingPdf || !qrUrl}
                onClick={() => void handleDownloadPdf()}
                className="gap-1.5 shadow-sm"
              >
                {downloadingPdf ? <Spinner label="" /> : <FileDown size={15} />}
                {downloadingPdf ? "Generando PDF..." : "Generar QR en PDF"}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                disabled={!qrUrl}
                onClick={() => qrUrl && downloadQrImage(qrUrl, `QR-${form.title || "formulario"}.png`)}
                className="gap-1.5"
                title="Descargar código QR como imagen"
              >
                <Download size={15} />
                Descargar PNG
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
