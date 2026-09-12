"use client";

import clsx from "clsx";
import {
  Eye,
  Link2,
  MoreVertical,
  Palette,
  Redo2,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button, IconButton, Logo } from "@/components/ui";
import { useEditor } from "@/store/editor";

export type EditorTab = "questions" | "responses" | "settings";

const TABS: { id: EditorTab; label: string }[] = [
  { id: "questions", label: "Preguntas" },
  { id: "responses", label: "Respuestas" },
  { id: "settings", label: "Configuracion" },
];

interface Props {
  tab: EditorTab;
  onTabChange: (tab: EditorTab) => void;
  responseCount: number;
  onOpenTheme: () => void;
  onOpenPreview: () => void;
  onOpenShare: () => void;
  onPublishToggle: () => void;
  onDelete: () => void;
}

export function EditorHeader({
  tab,
  onTabChange,
  responseCount,
  onOpenTheme,
  onOpenPreview,
  onOpenShare,
  onPublishToggle,
  onDelete,
}: Props) {
  const form = useEditor((s) => s.form);
  const update = useEditor((s) => s.update);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const past = useEditor((s) => s.past.length);
  const future = useEditor((s) => s.future.length);
  const saveState = useEditor((s) => s.saveState);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  if (!form) return null;

  const published = form.status === "published";

  return (
    <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-surface/80 backdrop-blur-2xl transition-all">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
        <Link href="/forms" aria-label="Volver a mis formularios">
          <Logo compact />
        </Link>

        <input
          value={form.title}
          onChange={(e) => update((draft) => void (draft.title = e.target.value), false)}
          aria-label="Titulo del formulario"
          className="min-w-0 flex-1 rounded-xl px-2.5 py-1 text-base font-semibold tracking-tight outline-none transition-colors hover:bg-black/[0.04] focus:bg-white focus:ring-1 focus:ring-[#0071E3] sm:max-w-md sm:flex-none"
        />

        <span className="ml-auto hidden text-xs font-medium text-muted sm:block">
          {saveState === "saving" && "Guardando..."}
          {saveState === "saved" && "Guardado"}
          {saveState === "error" && <span className="text-danger">Error al guardar</span>}
        </span>

        <div className="flex items-center gap-1">
          <IconButton label="Personalizar tema" onClick={onOpenTheme}>
            <Palette size={17} />
          </IconButton>
          <IconButton label="Vista previa" onClick={onOpenPreview}>
            <Eye size={17} />
          </IconButton>
          <IconButton label="Deshacer" onClick={undo} disabled={past === 0}>
            <Undo2 size={17} />
          </IconButton>
          <IconButton label="Rehacer" onClick={redo} disabled={future === 0}>
            <Redo2 size={17} />
          </IconButton>
          <IconButton label="Enviar y compartir" onClick={onOpenShare}>
            <Link2 size={17} />
          </IconButton>

          <Button
            variant={published ? "secondary" : "primary"}
            shape="pill"
            size="sm"
            onClick={onPublishToggle}
            className="ml-2 font-medium"
          >
            {published ? "Dejar de publicar" : "Publicar"}
          </Button>

          <div className="relative">
            <IconButton label="Mas opciones" onClick={() => setMenuOpen((v) => !v)}>
              <MoreVertical size={17} />
            </IconButton>
            {menuOpen && (
              <div
                ref={menuRef}
                className="lf-card absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-black/[0.08] bg-white/95 p-1.5 shadow-xl backdrop-blur-xl text-sm"
              >
                <button
                  type="button"
                  className="block w-full rounded-xl px-3.5 py-2 text-left transition-colors hover:bg-black/[0.05]"
                  onClick={() => {
                    onOpenPreview();
                    setMenuOpen(false);
                  }}
                >
                  Vista previa
                </button>
                <button
                  type="button"
                  className="block w-full rounded-xl px-3.5 py-2 text-left transition-colors hover:bg-black/[0.05]"
                  onClick={() => {
                    onOpenShare();
                    setMenuOpen(false);
                  }}
                >
                  Obtener enlace
                </button>
                <button
                  type="button"
                  className="block w-full rounded-xl px-3.5 py-2 text-left text-danger transition-colors hover:bg-red-50"
                  onClick={() => {
                    onDelete();
                    setMenuOpen(false);
                  }}
                >
                  Mover a la papelera
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Segmented Control */}
      <div className="flex justify-center pb-2.5 pt-1">
        <nav
          className="inline-flex items-center rounded-full bg-black/[0.06] p-1 shadow-inner"
          aria-label="Secciones del editor"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className={clsx(
                "relative rounded-full px-4 py-1.5 text-xs font-semibold tracking-tight transition-all duration-200 ease-out",
                tab === item.id
                  ? "bg-white text-ink shadow-[0_1px_4px_rgba(0,0,0,0.12)]"
                  : "text-muted hover:text-ink active:scale-95",
              )}
            >
              {item.label}
              {item.id === "responses" && responseCount > 0 && (
                <span
                  className={clsx(
                    "ml-1.5 rounded-full px-1.5 py-0.2 text-[10px]",
                    tab === item.id ? "bg-[#0071E3] text-white" : "bg-black/10 text-muted",
                  )}
                >
                  {responseCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
