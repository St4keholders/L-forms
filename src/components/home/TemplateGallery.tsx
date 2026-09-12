"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useState } from "react";
import { TEMPLATES, type FormTemplate } from "@/lib/templates";

/** Miniatura del formulario dibujada con cajas, sin imagenes externas. */
function Thumbnail({ template }: { template: FormTemplate }) {
  const isBlank = template.key === "blank";

  if (isBlank) {
    return (
      <div className="grid h-[150px] place-items-center border-b border-line bg-white">
        <Plus size={34} className="text-brand" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div
      className="h-[150px] border-b border-line p-3"
      style={{ backgroundColor: `${template.accent}14` }}
    >
      <div className="h-full rounded-sm bg-white p-2.5">
        <div className="h-2 w-3/5 rounded-xs" style={{ backgroundColor: template.accent }} />
        <div className="mt-1.5 h-1 w-2/5 rounded-xs bg-line" />
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-1 w-1/2 rounded-xs bg-ink/20" />
              <div className="h-1 w-4/5 rounded-xs bg-line" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TemplateGallery({
  onPick,
  busyKey,
}: {
  onPick: (template: FormTemplate) => void;
  busyKey: string | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const visible = expanded ? TEMPLATES : TEMPLATES.slice(0, 6);

  return (
    <section className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-medium">Crear un formulario</h1>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted transition-colors hover:bg-brand-soft hover:text-brand"
            aria-expanded={expanded}
          >
            Galeria de plantillas
            <ChevronDown
              size={16}
              className={expanded ? "rotate-180 transition-transform" : "transition-transform"}
            />
          </button>
        </div>

        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {visible.map((template) => (
            <li key={template.key}>
              <button
                type="button"
                onClick={() => onPick(template)}
                disabled={busyKey !== null}
                className="group w-full overflow-hidden rounded-lg border border-line bg-white text-left transition-colors hover:border-brand disabled:opacity-60"
              >
                <Thumbnail template={template} />
                <span className="block px-3 py-2.5">
                  <span className="block truncate text-sm font-medium">
                    {busyKey === template.key ? "Creando..." : template.name}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {template.tagline}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
