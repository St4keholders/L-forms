"use client";

import clsx from "clsx";
import { CircleDot, GripVertical, Square, X } from "lucide-react";
import { Select } from "@/components/ui";
import { makeOption } from "@/lib/defaults";
import { NEXT_SECTION, SUBMIT_FORM, type FormDoc, type Option, type Question } from "@/lib/types";

interface Props {
  question: Question;
  target: "options" | "rows" | "columns";
  onChange: (list: Option[]) => void;
  allowOther?: boolean;
  optionStyle?: "classic" | "card";
  /** Muestra el selector "ir a la seccion" por cada opcion. */
  logic?: { form: FormDoc; onChange: (map: Record<string, string>) => void };
}

const LABELS = {
  options: { add: "Anadir opcion", noun: "Opcion" },
  rows: { add: "Anadir fila", noun: "Fila" },
  columns: { add: "Anadir columna", noun: "Columna" },
};

export function OptionsEditor({ question, target, onChange, allowOther, optionStyle = "classic", logic }: Props) {
  const list = question[target] ?? [];
  const labels = LABELS[target];
  const marker =
    question.type === "checkboxes" || question.type === "grid_checkbox" ? (
      <Square size={16} className="shrink-0 text-faint" />
    ) : (
      <CircleDot size={16} className="shrink-0 text-faint" />
    );

  function updateLabel(id: string, label: string) {
    onChange(list.map((o) => (o.id === id ? { ...o, label } : o)));
  }

  function remove(id: string) {
    onChange(list.filter((o) => o.id !== id));
    if (logic && question.goToSection?.[id]) {
      const next = { ...question.goToSection };
      delete next[id];
      logic.onChange(next);
    }
  }

  function add(isOther = false) {
    const label = isOther ? "Otro" : `${labels.noun} ${list.filter((o) => !o.isOther).length + 1}`;
    const withoutOther = list.filter((o) => !o.isOther);
    const other = list.find((o) => o.isOther);
    const created = makeOption(label, isOther);
    onChange(isOther ? [...withoutOther, created] : [...withoutOther, created, ...(other ? [other] : [])]);
  }

  return (
    <div className="space-y-2">
      {list.map((option) => (
        <div key={option.id} className="space-y-1.5">
          <div
            className={clsx(
              "flex items-center gap-2 transition-all duration-200",
              optionStyle === "card"
                ? "rounded-2xl border border-black/[0.08] bg-white/70 px-3 py-2 hover:border-black/20 hover:bg-white shadow-xs"
                : "py-0.5",
            )}
          >
            <GripVertical size={16} className="shrink-0 cursor-grab text-line" aria-hidden />
            {target === "columns" ? (
              <span className="w-4 shrink-0 text-sm text-faint">·</span>
            ) : (
              marker
            )}
            <input
              value={option.label}
              readOnly={option.isOther}
              onChange={(e) => updateLabel(option.id, e.target.value)}
              className={clsx(
                "flex-1 bg-transparent px-1 py-1 text-sm outline-none transition-colors",
                optionStyle === "classic" && "lf-underline",
              )}
              aria-label={`${labels.noun}: ${option.label}`}
            />
            {list.length > 1 && (
              <button
                type="button"
                onClick={() => remove(option.id)}
                aria-label={`Quitar ${option.label}`}
                className="text-faint transition-colors hover:text-danger"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {logic && !option.isOther && (
            <div className="flex items-center gap-2 pl-8">
              <span className="text-xs text-muted">Ir a</span>
              <Select
                className="max-w-xs flex-1 py-1 text-xs"
                value={question.goToSection?.[option.id] ?? NEXT_SECTION}
                onChange={(e) =>
                  logic.onChange({ ...(question.goToSection ?? {}), [option.id]: e.target.value })
                }
                aria-label={`Seccion siguiente si responde ${option.label}`}
              >
                <option value={NEXT_SECTION}>Continuar a la siguiente seccion</option>
                {logic.form.sections.map((section, index) => (
                  <option key={section.id} value={section.id}>
                    Seccion {index + 1}: {section.title}
                  </option>
                ))}
                <option value={SUBMIT_FORM}>Enviar el formulario</option>
              </Select>
            </div>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3 pl-8 pt-1 text-sm">
        <button
          type="button"
          onClick={() => add(false)}
          className="font-medium text-brand hover:underline"
        >
          {labels.add}
        </button>
        {allowOther && !list.some((o) => o.isOther) && (
          <>
            <span className="text-faint">o</span>
            <button
              type="button"
              onClick={() => add(true)}
              className="font-medium text-brand hover:underline"
            >
              anadir "Otro"
            </button>
          </>
        )}
      </div>
    </div>
  );
}
