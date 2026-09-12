"use client";

import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Select, Toggle } from "@/components/ui";
import type { FormSettings } from "@/lib/types";
import { useEditor } from "@/store/editor";

function Row({
  title,
  description,
  control,
}: {
  title: string;
  description?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-black/[0.05] px-6 py-4.5 transition-colors last:border-b-0 hover:bg-black/[0.015]">
      <div className="min-w-0">
        <p className="text-sm font-semibold tracking-tight text-ink">{title}</p>
        {description && <p className="mt-1 text-xs text-muted leading-relaxed">{description}</p>}
      </div>
      <div className="shrink-0 pt-0.5">{control}</div>
    </div>
  );
}

function Collapsible({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-black/[0.05] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-6 px-6 py-4.5 text-left transition-colors hover:bg-black/[0.02]"
      >
        <span>
          <span className="block text-sm font-semibold tracking-tight text-ink">{title}</span>
          <span className="mt-0.5 block text-xs text-muted">{description}</span>
        </span>
        <ChevronDown size={17} className={open ? "rotate-180 transition-transform duration-200" : "transition-transform duration-200"} />
      </button>
      {open && <div className="border-t border-black/[0.05] bg-black/[0.015]">{children}</div>}
    </div>
  );
}

export function SettingsTab() {
  const form = useEditor((s) => s.form);
  const update = useEditor((s) => s.update);
  if (!form) return null;

  const settings = form.settings;
  const set = (patch: Partial<FormSettings>) =>
    update((draft) => void Object.assign(draft.settings, patch));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
      <section className="lf-card overflow-hidden rounded-[24px] border border-black/[0.06] bg-white shadow-sm">
        <h2 className="border-b border-black/[0.06] px-6 py-4 text-base font-bold tracking-tight text-ink">Configuracion</h2>

        <Row
          title="Convertir en un cuestionario"
          description="Asignar puntuaciones, definir respuestas y proporcionar comentarios automaticamente"
          control={
            <Toggle
              checked={settings.isQuiz}
              onChange={(isQuiz) => set({ isQuiz })}
              label="Convertir en cuestionario"
            />
          }
        />

        {settings.isQuiz && (
          <div className="bg-brand-tint">
            <Row
              title="Publicar la nota"
              control={
                <Select
                  value={settings.quiz.releaseGrades}
                  onChange={(e) =>
                    set({
                      quiz: {
                        ...settings.quiz,
                        releaseGrades: e.target.value as "immediately" | "later",
                      },
                    })
                  }
                  aria-label="Momento de publicar la nota"
                >
                  <option value="immediately">Justo despues de cada envio</option>
                  <option value="later">Mas tarde, tras revisarlas</option>
                </Select>
              }
            />
            <Row
              title="Mostrar las preguntas falladas"
              control={
                <Toggle
                  checked={settings.quiz.showMissed}
                  onChange={(showMissed) => set({ quiz: { ...settings.quiz, showMissed } })}
                  label="Mostrar preguntas falladas"
                />
              }
            />
            <Row
              title="Mostrar las respuestas correctas"
              control={
                <Toggle
                  checked={settings.quiz.showCorrect}
                  onChange={(showCorrect) => set({ quiz: { ...settings.quiz, showCorrect } })}
                  label="Mostrar respuestas correctas"
                />
              }
            />
            <Row
              title="Mostrar el puntaje al terminar"
              control={
                <Toggle
                  checked={settings.quiz.showPoints}
                  onChange={(showPoints) => set({ quiz: { ...settings.quiz, showPoints } })}
                  label="Mostrar puntaje"
                />
              }
            />
          </div>
        )}

        <Collapsible title="Respuestas" description="Gestionar como se obtienen y protegen las respuestas">
          <Row
            title="Recoger direcciones de correo"
            description="Se pide el correo antes de responder."
            control={
              <Toggle
                checked={settings.collectEmail}
                onChange={(collectEmail) => set({ collectEmail })}
                label="Recoger correos"
              />
            }
          />
          <Row
            title="Limitar a una respuesta por persona"
            control={
              <Toggle
                checked={settings.limitOneResponse}
                onChange={(limitOneResponse) => set({ limitOneResponse })}
                label="Limitar a una respuesta"
              />
            }
          />
          <Row
            title="Permitir editar despues de enviar"
            control={
              <Toggle
                checked={settings.allowEdit}
                onChange={(allowEdit) => set({ allowEdit })}
                label="Permitir editar"
              />
            }
          />
          <Row
            title="Mostrar el resumen de respuestas a quien responde"
            control={
              <Toggle
                checked={settings.showSummary}
                onChange={(showSummary) => set({ showSummary })}
                label="Mostrar resumen"
              />
            }
          />
        </Collapsible>

        <Collapsible
          title="Presentacion"
          description="Gestionar como se presentan el formulario y las respuestas"
        >
          <Row
            title="Mostrar barra de progreso"
            control={
              <Toggle
                checked={settings.showProgressBar}
                onChange={(showProgressBar) => set({ showProgressBar })}
                label="Barra de progreso"
              />
            }
          />
          <Row
            title="Barajar el orden de las preguntas"
            control={
              <Toggle
                checked={settings.shuffleQuestions}
                onChange={(shuffleQuestions) => set({ shuffleQuestions })}
                label="Barajar preguntas"
              />
            }
          />
          <Row
            title="Mostrar el enlace para enviar otra respuesta"
            control={
              <Toggle
                checked={settings.showAnotherResponseLink}
                onChange={(showAnotherResponseLink) => set({ showAnotherResponseLink })}
                label="Enlace para responder de nuevo"
              />
            }
          />
          <div className="px-6 py-5">
            <label htmlFor="confirmation" className="block text-sm">
              Mensaje de confirmacion
            </label>
            <textarea
              id="confirmation"
              rows={2}
              value={settings.confirmationMessage}
              onChange={(e) => set({ confirmationMessage: e.target.value })}
              className="mt-2 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
            />
          </div>
        </Collapsible>
      </section>

      <section className="lf-card overflow-hidden">
        <h2 className="border-b border-line px-6 py-4 text-lg">Valores predeterminados</h2>

        <Collapsible
          title="Ajustes predeterminados del formulario"
          description="Ajustes aplicados a este formulario y a los formularios nuevos"
        >
          <Row
            title="Recoger correos en los formularios nuevos"
            control={
              <Toggle
                checked={settings.collectEmail}
                onChange={(collectEmail) => set({ collectEmail })}
                label="Recoger correos por defecto"
              />
            }
          />
        </Collapsible>

        <Collapsible
          title="Ajustes predeterminados de la pregunta"
          description="Ajustes aplicados a todas las preguntas nuevas"
        >
          <Row
            title="Hacer obligatorias las preguntas nuevas"
            control={
              <Toggle
                checked={settings.defaultRequired}
                onChange={(defaultRequired) => set({ defaultRequired })}
                label="Preguntas obligatorias por defecto"
              />
            }
          />
        </Collapsible>
      </section>
    </div>
  );
}
