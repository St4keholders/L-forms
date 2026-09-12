"use client";

import { Eraser, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, TextField } from "@/components/ui";
import { sha256 } from "@/lib/hash";
import type { Question, SignatureValue } from "@/lib/types";

interface Props {
  question: Question;
  value: SignatureValue | null;
  onChange: (value: SignatureValue | null) => void;
  /** Texto del contenido firmado; entra en el hash junto a la firma. */
  documentSummary: string;
  accent: string;
  disabled?: boolean;
}

const CANVAS_WIDTH = 640;
const CANVAS_HEIGHT = 200;

export function SignaturePad({
  question,
  value,
  onChange,
  documentSummary,
  accent,
  disabled,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStrokes = useRef(false);
  const [typedName, setTypedName] = useState(value?.typedName ?? "");
  const [consent, setConsent] = useState(value?.consent ?? false);
  const [mode, setMode] = useState<"drawn" | "uploaded">(value?.method ?? "drawn");
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(
    value?.method === "uploaded" ? value.imageUrl : null,
  );
  const config = question.signature;

  /* El lienzo se dibuja a escala del dispositivo para que el trazo no salga borroso. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = CANVAS_WIDTH * ratio;
    canvas.height = CANVAS_HEIGHT * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1F1B2E";
  }, []);

  const emit = useCallback(
    async (imageUrl: string | null, method: "drawn" | "uploaded", name: string, agreed: boolean) => {
      if (!imageUrl) {
        onChange(null);
        return;
      }
      const signedAt = new Date().toISOString();
      const hash = await sha256(`${documentSummary}|${name}|${agreed}|${signedAt}|${imageUrl.slice(0, 512)}`);
      onChange({
        imageUrl,
        typedName: name,
        consent: agreed,
        signedAt,
        hash,
        userAgent: typeof navigator === "undefined" ? "" : navigator.userAgent,
        method,
      });
    },
    [documentSummary, onChange],
  );

  function pointerPosition(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPosition(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    drawing.current = true;
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointerPosition(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    hasStrokes.current = true;
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    if (!hasStrokes.current) return;
    const url = canvasRef.current?.toDataURL("image/png") ?? null;
    void emit(url, "drawn", typedName, consent);
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasStrokes.current = false;
    setUploadedUrl(null);
    onChange(null);
  }

  async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    setUploadedUrl(url);
    setMode("uploaded");
    void emit(url, "uploaded", typedName, consent);
  }

  function updateName(name: string) {
    setTypedName(name);
    const url = mode === "uploaded" ? uploadedUrl : (canvasRef.current?.toDataURL("image/png") ?? null);
    if (hasStrokes.current || uploadedUrl) void emit(url, mode, name, consent);
  }

  function updateConsent(agreed: boolean) {
    setConsent(agreed);
    const url = mode === "uploaded" ? uploadedUrl : (canvasRef.current?.toDataURL("image/png") ?? null);
    if (hasStrokes.current || uploadedUrl) void emit(url, mode, typedName, agreed);
  }

  return (
    <div className="space-y-4">
      {mode === "uploaded" && uploadedUrl ? (
        <div className="rounded-lg border border-line bg-white p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={uploadedUrl} alt="Firma subida" className="mx-auto max-h-40" />
        </div>
      ) : (
        <div className="relative rounded-lg border border-line bg-white">
          <canvas
            ref={canvasRef}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            style={{ width: "100%", height: CANVAS_HEIGHT, touchAction: "none" }}
            className="cursor-crosshair rounded-lg"
            aria-label="Area para dibujar la firma"
          />
          <span className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-dashed border-line" />
          <span className="pointer-events-none absolute bottom-3 left-6 text-xs text-faint">
            Dibuja tu firma sobre la linea
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" type="button" onClick={clear} disabled={disabled}>
          <Eraser size={15} /> Borrar
        </Button>
        {config?.allowUpload && (
          <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-medium transition-colors hover:bg-brand-tint">
            <Upload size={15} /> Subir imagen
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => void onUpload(e)}
              disabled={disabled}
            />
          </label>
        )}
        {mode === "uploaded" && (
          <Button
            size="sm"
            type="button"
            onClick={() => {
              setMode("drawn");
              setUploadedUrl(null);
              onChange(null);
            }}
          >
            Dibujar en su lugar
          </Button>
        )}
      </div>

      {config?.requireTypedName && (
        <div>
          <label className="mb-1.5 block text-sm font-medium">Nombre completo de quien firma</label>
          <TextField
            value={typedName}
            onChange={(e) => updateName(e.target.value)}
            placeholder="Tal como aparece en tu documento"
            disabled={disabled}
          />
        </div>
      )}

      {config?.requireConsent && (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-brand-tint p-3 text-sm">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => updateConsent(e.target.checked)}
            disabled={disabled}
            className="mt-0.5 h-4 w-4 shrink-0"
            style={{ accentColor: accent }}
          />
          <span>{config.consentText}</span>
        </label>
      )}

      {value?.hash && (
        <p className="text-xs text-faint">
          Firma registrada el{" "}
          {new Date(value.signedAt).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })}{" "}
          · codigo {value.hash.slice(0, 12)}
        </p>
      )}
    </div>
  );
}
