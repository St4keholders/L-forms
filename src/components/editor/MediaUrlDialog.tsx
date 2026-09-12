"use client";

import clsx from "clsx";
import { Image as ImageIcon, Link as LinkIcon, Sparkles, X, Youtube } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, IconButton, Modal, TextField } from "@/components/ui";

interface Props {
  open: boolean;
  onClose: () => void;
  type: "image" | "video";
  onConfirm: (url: string) => void;
  initialUrl?: string;
  accentColor?: string;
}

function toEmbedUrl(url: string): string {
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

export function MediaUrlDialog({
  open,
  onClose,
  type,
  onConfirm,
  initialUrl = "",
  accentColor = "#0071E3",
}: Props) {
  const [url, setUrl] = useState(initialUrl);
  const [previewError, setPreviewError] = useState(false);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setPreviewError(false);
    }
  }, [open, initialUrl]);

  function handleSave() {
    const trimmed = url.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    onClose();
  }

  const isVideo = type === "video";
  const embedUrl = isVideo ? toEmbedUrl(url) : "";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isVideo ? "Insertar Video de YouTube" : "Insertar Imagen por Enlace"}
      width="max-w-lg"
    >
      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
            <LinkIcon size={14} style={{ color: accentColor }} />
            URL de la {isVideo ? "video (YouTube)" : "imagen (Web)"}
          </label>
          <div className="mt-2 flex gap-2">
            <TextField
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setPreviewError(false);
              }}
              placeholder={
                isVideo
                  ? "https://www.youtube.com/watch?v=..."
                  : "https://images.unsplash.com/..."
              }
              autoFocus
              className="flex-1 text-xs"
            />
            {url && (
              <IconButton label="Limpiar enlace" onClick={() => setUrl("")}>
                <X size={16} />
              </IconButton>
            )}
          </div>
        </div>

        {/* Vista previa en vivo */}
        {url.trim() && (
          <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-black/[0.02] p-3">
            <span className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <Sparkles size={13} style={{ color: accentColor }} />
              Vista Previa
            </span>

            {isVideo ? (
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                <iframe
                  src={embedUrl}
                  title="Vista previa de YouTube"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : (
              <div className="relative flex max-h-56 min-h-32 w-full items-center justify-center overflow-hidden rounded-xl bg-black/[0.04]">
                {!previewError ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt="Vista previa"
                    className="max-h-56 w-full object-contain"
                    onError={() => setPreviewError(true)}
                  />
                ) : (
                  <p className="p-4 text-center text-xs text-danger">
                    No se pudo cargar la imagen desde este enlace. Asegurate de que sea una URL directa de imagen (.jpg, .png, .webp).
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Ejemplos sugeridos */}
        {!url && (
          <div className="rounded-2xl border border-black/[0.06] bg-black/[0.02] p-3 text-xs text-muted">
            <p className="font-medium text-ink">Consejo:</p>
            <p className="mt-1 text-[11px] leading-relaxed">
              {isVideo
                ? "Puedes pegar cualquier enlace normal de YouTube o YouTube Shorts. Se incrustara automaticamente."
                : "Puedes usar enlaces directos de Unsplash, Pexels o cualquier servidor web publico."}
            </p>
          </div>
        )}

        {/* Botones de accion */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" shape="pill" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            shape="pill"
            size="sm"
            disabled={!url.trim()}
            onClick={handleSave}
            style={{ backgroundColor: accentColor, borderColor: accentColor }}
          >
            {isVideo ? "Insertar Video" : "Insertar Imagen"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
