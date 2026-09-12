"use client";

import clsx from "clsx";
import { Copy, GripVertical, ImagePlus, MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MediaUrlDialog } from "./MediaUrlDialog";
import { OptionsEditor } from "./OptionsEditor";
import { IconButton, Select, TextField, Toggle } from "@/components/ui";
import {
  CHOICE_TYPES,
  GRID_TYPES,
  QUESTION_TYPES,
  type Option,
  type Question,
  type QuestionType,
  type Validation,
} from "@/lib/types";
import { makeQuestion } from "@/lib/defaults";
import { getThemeCardClass } from "@/lib/theme";
import { useEditor } from "@/store/editor";

interface Props {
  question: Question;
  sectionId: string;
  active: boolean;
  onActivate: () => void;
  dragHandle?: ReactNode;
}

const VALIDATION_RULES: Record<string, { value: string; label: string }[]> = {
  number: [
    { value: "gt", label: "Mayor que" },
    { value: "gte", label: "Mayor o igual que" },
    { value: "lt", label: "Menor que" },
    { value: "lte", label: "Menor o igual que" },
    { value: "between", label: "Entre" },
    { value: "integer", label: "Numero entero" },
  ],
  length: [
    { value: "max", label: "Longitud maxima" },
    { value: "min", label: "Longitud minima" },
  ],
  regex: [
    { value: "contains", label: "Contiene" },
    { value: "matches", label: "Coincide con la expresion" },
  ],
};

export function QuestionCard({ question, sectionId, active, onActivate, dragHandle }: Props) {
  const form = useEditor((s) => s.form);
  const updateQuestion = useEditor((s) => s.updateQuestion);
  const deleteQuestion = useEditor((s) => s.deleteQuestion);
  const duplicateQuestion = useEditor((s) => s.duplicateQuestion);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
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
  const isQuiz = form.settings.isQuiz;
  const cardCombinedClass = getThemeCardClass(form.theme);
  const patch = (values: Partial<Question>) => updateQuestion(question.id, values);

  /** Al cambiar de tipo se reconstruye la pregunta conservando lo compatible. */
  function changeType(type: QuestionType) {
    const fresh = makeQuestion(type, question.required);
    patch({
      type,
      options: fresh.options ?? undefined,
      rows: fresh.rows ?? undefined,
      columns: fresh.columns ?? undefined,
      scale: fresh.scale,
      rating: fresh.rating,
      fileUpload: fresh.fileUpload,
      signature: fresh.signature,
      goToSection: undefined,
      answerKey: undefined,
      validation: undefined,
    });
  }

  function setValidation(values: Partial<Validation>) {
    const current: Validation = question.validation ?? {
      kind: "number",
      rule: "gt",
      value: "",
    };
    patch({ validation: { ...current, ...values } });
  }

  /* ---------------- Vista contraida ---------------- */

  if (!active) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className={clsx(
          "lf-card w-full p-6 text-left transition-all duration-200 hover:shadow-md active:scale-[0.99]",
          cardCombinedClass,
        )}
      >
        <p className="text-base font-semibold tracking-tight text-ink">
          {question.title || "Pregunta sin titulo"}
          {question.required && <span className="ml-1 text-danger">*</span>}
        </p>
        {question.showDescription && question.description && (
          <p className="mt-1 text-sm text-muted">{question.description}</p>
        )}
        <p className="mt-3 text-xs font-medium text-faint">
          {QUESTION_TYPES.find((t) => t.type === question.type)?.label}
          {CHOICE_TYPES.includes(question.type) && ` · ${question.options?.length ?? 0} opciones`}
          {isQuiz && question.points ? ` · ${question.points} pt` : ""}
        </p>
      </button>
    );
  }

  /* ---------------- Editor por tipo ---------------- */

  function renderTypeEditor() {
    if (!form) return null;
    if (CHOICE_TYPES.includes(question.type)) {
      return (
        <OptionsEditor
          question={question}
          target="options"
          allowOther={question.type !== "dropdown"}
          optionStyle={form.theme.optionStyle}
          onChange={(options: Option[]) => patch({ options })}
          logic={
            question.type === "multiple_choice" && form.sections.length > 1
              ? { form, onChange: (goToSection) => patch({ goToSection }) }
              : undefined
          }
        />
      );
    }

    if (GRID_TYPES.includes(question.type)) {
      return (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-medium">Filas</p>
            <OptionsEditor
              question={question}
              target="rows"
              optionStyle={form.theme.optionStyle}
              onChange={(rows) => patch({ rows })}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Columnas</p>
            <OptionsEditor
              question={question}
              target="columns"
              optionStyle={form.theme.optionStyle}
              onChange={(columns) => patch({ columns })}
            />
          </div>
        </div>
      );
    }

    switch (question.type) {
      case "short_text":
      case "paragraph":
        return (
          <div className="max-w-md rounded-xl border border-dashed border-black/15 bg-black/[0.02] px-4 py-3 text-xs font-medium text-muted">
            {question.type === "short_text" ? "Campo de respuesta corta" : "Area de respuesta larga"}
          </div>
        );

      case "linear_scale": {
        const scale = question.scale!;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Select
                value={scale.min}
                onChange={(e) => patch({ scale: { ...scale, min: Number(e.target.value) } })}
                aria-label="Valor minimo"
              >
                <option value={0}>0</option>
                <option value={1}>1</option>
              </Select>
              <span className="text-sm text-muted">a</span>
              <Select
                value={scale.max}
                onChange={(e) => patch({ scale: { ...scale, max: Number(e.target.value) } })}
                aria-label="Valor maximo"
              >
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <TextField
                placeholder={`Etiqueta para ${scale.min}`}
                value={scale.minLabel}
                onChange={(e) => patch({ scale: { ...scale, minLabel: e.target.value } })}
              />
              <TextField
                placeholder={`Etiqueta para ${scale.max}`}
                value={scale.maxLabel}
                onChange={(e) => patch({ scale: { ...scale, maxLabel: e.target.value } })}
              />
            </div>
          </div>
        );
      }

      case "rating": {
        const rating = question.rating!;
        return (
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={rating.max}
              onChange={(e) => patch({ rating: { ...rating, max: Number(e.target.value) } })}
              aria-label="Cantidad de niveles"
            >
              {[3, 4, 5, 7, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
            <Select
              value={rating.icon}
              onChange={(e) =>
                patch({ rating: { ...rating, icon: e.target.value as "star" | "heart" | "thumb" } })
              }
              aria-label="Icono"
            >
              <option value="star">Estrellas</option>
              <option value="heart">Corazones</option>
              <option value="thumb">Pulgares</option>
            </Select>
          </div>
        );
      }

      case "file_upload": {
        const config = question.fileUpload!;
        return (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm">
              <span className="mb-1 block text-muted">Archivos permitidos</span>
              <Select
                className="w-full"
                value={config.maxFiles}
                onChange={(e) =>
                  patch({ fileUpload: { ...config, maxFiles: Number(e.target.value) } })
                }
              >
                {[1, 3, 5, 10].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted">Tamano maximo (MB)</span>
              <Select
                className="w-full"
                value={config.maxSizeMb}
                onChange={(e) =>
                  patch({ fileUpload: { ...config, maxSizeMb: Number(e.target.value) } })
                }
              >
                {[1, 5, 10, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted">Tipos aceptados</span>
              <Select
                className="w-full"
                value={config.accept}
                onChange={(e) => patch({ fileUpload: { ...config, accept: e.target.value } })}
              >
                <option value="*/*">Cualquiera</option>
                <option value="image/*">Imagenes</option>
                <option value="application/pdf">PDF</option>
                <option value=".doc,.docx,.pdf">Documentos</option>
              </Select>
            </label>
          </div>
        );
      }

      case "signature": {
        const config = question.signature!;
        return (
          <div className="space-y-4">
            <div className="rounded-lg border border-dashed border-line bg-brand-tint px-4 py-6 text-center text-sm text-muted">
              Quien responda dibujara aqui su firma.
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-muted">Texto de la declaracion</span>
              <textarea
                rows={2}
                value={config.consentText}
                onChange={(e) => patch({ signature: { ...config, consentText: e.target.value } })}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["requireTypedName", "Pedir el nombre completo escrito"],
                  ["requireConsent", "Exigir aceptar la declaracion"],
                  ["allowUpload", "Permitir subir una imagen de firma"],
                  ["certificate", "Generar certificado PDF descargable"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 text-sm">
                  <Toggle
                    checked={config[key]}
                    onChange={(checked) => patch({ signature: { ...config, [key]: checked } })}
                    label={label}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        );
      }

      case "date":
      case "time":
        return (
          <div className="max-w-xs rounded-xl border border-dashed border-black/15 bg-black/[0.02] px-4 py-2.5 text-xs font-medium text-muted">
            {question.type === "date" ? "Selector de fecha (Dia, mes, ano)" : "Selector de hora"}
          </div>
        );

      default:
        return null;
    }
  }

  /* ---------------- Bloque de cuestionario ---------------- */

  function renderQuizBlock() {
    if (!isQuiz) return null;
    const canHaveKey = CHOICE_TYPES.includes(question.type) || question.type === "short_text";
    return (
      <div className="mt-6 rounded-lg border border-line bg-brand-tint p-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            Puntos
            <TextField
              type="number"
              min={0}
              className="w-20"
              value={question.points ?? 0}
              onChange={(e) => patch({ points: Number(e.target.value) })}
            />
          </label>
          {!canHaveKey && (
            <span className="text-xs text-muted">
              Este tipo de pregunta se califica manualmente.
            </span>
          )}
        </div>

        {canHaveKey && CHOICE_TYPES.includes(question.type) && (
          <div className="mt-3">
            <p className="mb-2 text-sm font-medium">Respuestas correctas</p>
            <div className="space-y-1.5">
              {(question.options ?? []).map((option) => {
                const key = question.answerKey ?? [];
                const checked = key.includes(option.label);
                return (
                  <label key={option.id} className="flex items-center gap-2 text-sm">
                    <input
                      type={question.type === "checkboxes" ? "checkbox" : "radio"}
                      name={`key-${question.id}`}
                      checked={checked}
                      onChange={() =>
                        patch({
                          answerKey:
                            question.type === "checkboxes"
                              ? checked
                                ? key.filter((k) => k !== option.label)
                                : [...key, option.label]
                              : [option.label],
                        })
                      }
                      className="h-4 w-4 accent-brand"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {canHaveKey && question.type === "short_text" && (
          <label className="mt-3 block text-sm">
            <span className="mb-1 block text-muted">Respuesta aceptada</span>
            <TextField
              value={question.answerKey?.[0] ?? ""}
              onChange={(e) => patch({ answerKey: e.target.value ? [e.target.value] : [] })}
              placeholder="Texto exacto, sin distinguir mayusculas"
            />
          </label>
        )}

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Comentario si acierta</span>
            <TextField
              value={question.feedback?.correct ?? ""}
              onChange={(e) =>
                patch({ feedback: { ...question.feedback, correct: e.target.value } })
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Comentario si falla</span>
            <TextField
              value={question.feedback?.incorrect ?? ""}
              onChange={(e) =>
                patch({ feedback: { ...question.feedback, incorrect: e.target.value } })
              }
            />
          </label>
        </div>
      </div>
    );
  }

  /* ---------------- Validacion ---------------- */

  function renderValidation() {
    const validation = question.validation;
    if (!validation || validation.kind === "none") return null;
    const rules = VALIDATION_RULES[validation.kind] ?? [];
    return (
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <Select
          value={validation.kind}
          onChange={(e) =>
            setValidation({
              kind: e.target.value as Validation["kind"],
              rule: VALIDATION_RULES[e.target.value]?.[0]?.value ?? "gt",
            })
          }
          aria-label="Tipo de validacion"
        >
          <option value="number">Numero</option>
          <option value="length">Longitud</option>
          <option value="regex">Texto</option>
        </Select>
        <Select
          value={validation.rule}
          onChange={(e) => setValidation({ rule: e.target.value })}
          aria-label="Condicion"
        >
          {rules.map((rule) => (
            <option key={rule.value} value={rule.value}>
              {rule.label}
            </option>
          ))}
        </Select>
        {validation.rule !== "integer" && (
          <TextField
            className="w-28"
            value={validation.value}
            onChange={(e) => setValidation({ value: e.target.value })}
            placeholder="Valor"
            aria-label="Valor de referencia"
          />
        )}
        {validation.rule === "between" && (
          <TextField
            className="w-28"
            value={validation.value2 ?? ""}
            onChange={(e) => setValidation({ value2: e.target.value })}
            placeholder="y"
            aria-label="Segundo valor"
          />
        )}
        <TextField
          className="min-w-40 flex-1"
          value={validation.message ?? ""}
          onChange={(e) => setValidation({ message: e.target.value })}
          placeholder="Mensaje de error personalizado"
          aria-label="Mensaje de error"
        />
        <button
          type="button"
          onClick={() => patch({ validation: undefined })}
          className="text-sm text-muted hover:text-danger"
        >
          Quitar
        </button>
      </div>
    );
  }

  /* ---------------- Tarjeta ---------------- */

  return (
    <article
      className={clsx(
        "lf-card relative p-7 shadow-lg transition-all duration-200",
        cardCombinedClass,
        "border-l-4",
      )}
      style={{ borderLeftColor: form.theme.primaryColor }}
    >
      {dragHandle && (
        <div className="absolute inset-x-0 top-1.5 flex justify-center text-line">{dragHandle}</div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <input
            value={question.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Pregunta"
            aria-label="Texto de la pregunta"
            className="w-full rounded-xl bg-black/[0.025] px-3.5 py-2.5 text-base font-semibold tracking-tight outline-none transition-all hover:bg-black/[0.04] focus:bg-white focus:ring-2 focus:ring-[#0071E3]/20"
          />
          {question.showDescription && (
            <input
              value={question.description ?? ""}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="Descripcion de la pregunta (opcional)"
              aria-label="Descripcion de la pregunta"
              className="mt-2 w-full rounded-xl bg-transparent px-3 py-1.5 text-xs text-muted outline-none transition-colors hover:bg-black/[0.02] focus:bg-white focus:ring-1 focus:ring-[#0071E3]/20 placeholder:text-faint"
            />
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <IconButton
            label="Anadir imagen a la pregunta"
            onClick={() => setImageDialogOpen(true)}
          >
            <ImagePlus size={17} />
          </IconButton>
          <Select
            value={question.type}
            onChange={(e) => changeType(e.target.value as QuestionType)}
            aria-label="Tipo de pregunta"
            className="w-52"
          >
            {QUESTION_TYPES.map((option) => (
              <option key={option.type} value={option.type}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {question.media?.url && (
        <div className="mt-4 flex items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={question.media.url} alt="" className="max-h-56 rounded-2xl border border-black/10 shadow-sm" />
          <button
            type="button"
            onClick={() => patch({ media: undefined })}
            className="text-xs font-medium text-muted hover:text-danger"
          >
            Quitar
          </button>
        </div>
      )}

      <div className="mt-5">{renderTypeEditor()}</div>

      {renderQuizBlock()}
      {renderValidation()}

      <footer className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-black/[0.06] pt-3.5">
        <IconButton label="Duplicar pregunta" onClick={() => duplicateQuestion(question.id)}>
          <Copy size={17} />
        </IconButton>
        <IconButton label="Eliminar pregunta" onClick={() => deleteQuestion(question.id)}>
          <Trash2 size={17} />
        </IconButton>
        <span className="mx-1 h-5 w-px bg-black/10" aria-hidden />
        <label className="flex items-center gap-2.5 text-xs font-medium text-muted">
          Obligatoria
          <Toggle
            checked={question.required}
            onChange={(required) => patch({ required })}
            label="Pregunta obligatoria"
          />
        </label>

        <div className="relative">
          <IconButton label="Mas opciones de la pregunta" onClick={() => setMenuOpen((v) => !v)}>
            <MoreVertical size={17} />
          </IconButton>
          {menuOpen && (
            <div ref={menuRef} className="lf-card absolute right-0 bottom-10 z-20 w-64 overflow-hidden rounded-2xl border border-black/[0.08] bg-white/95 p-1.5 shadow-xl backdrop-blur-xl text-sm">
              <button
                type="button"
                className="block w-full rounded-xl px-3.5 py-2 text-left transition-colors hover:bg-black/[0.05]"
                onClick={() => patch({ showDescription: !question.showDescription })}
              >
                {question.showDescription ? "Ocultar" : "Mostrar"} descripcion
              </button>
              {CHOICE_TYPES.includes(question.type) && (
                <button
                  type="button"
                  className="block w-full rounded-xl px-3.5 py-2 text-left transition-colors hover:bg-black/[0.05]"
                  onClick={() => patch({ shuffleOptions: !question.shuffleOptions })}
                >
                  {question.shuffleOptions ? "No barajar" : "Barajar"} las opciones
                </button>
              )}
              {(question.type === "short_text" || question.type === "paragraph") && (
                <button
                  type="button"
                  className="block w-full rounded-xl px-3.5 py-2 text-left transition-colors hover:bg-black/[0.05]"
                  onClick={() =>
                    patch({
                      validation: question.validation
                        ? undefined
                        : { kind: "number", rule: "gt", value: "" },
                    })
                  }
                >
                  {question.validation ? "Quitar" : "Anadir"} validacion de respuesta
                </button>
              )}
              <button
                type="button"
                className="block w-full rounded-xl px-3.5 py-2 text-left transition-colors hover:bg-black/[0.05]"
                onClick={() => duplicateQuestion(question.id)}
              >
                Duplicar
              </button>
            </div>
          )}
        </div>
      </footer>

      <span className="sr-only">Pregunta de la seccion {sectionId}</span>

      <MediaUrlDialog
        open={imageDialogOpen}
        type="image"
        accentColor={form.theme.primaryColor}
        initialUrl={question.media?.type === "image" ? question.media.url : ""}
        onClose={() => setImageDialogOpen(false)}
        onConfirm={(url) => patch({ media: { type: "image", url } })}
      />
    </article>
  );
}
