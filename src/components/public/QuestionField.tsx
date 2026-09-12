"use client";

import clsx from "clsx";
import { Heart, Paperclip, Star, ThumbsUp, X } from "lucide-react";
import { useMemo, useState } from "react";
import { SignaturePad } from "./SignaturePad";
import { Select, TextField } from "@/components/ui";
import { dataSource } from "@/lib/data";
import { shuffle } from "@/lib/logic";
import type { AnswerValue, Option, Question, SignatureValue, UploadedFile } from "@/lib/types";

interface Props {
  question: Question;
  value: AnswerValue;
  onChange: (value: AnswerValue) => void;
  error?: string;
  accent: string;
  documentSummary: string;
  disabled?: boolean;
  cardClassName?: string;
  optionStyle?: "classic" | "card";
}

function useOptions(question: Question): Option[] {
  return useMemo(() => {
    const options = question.options ?? [];
    return question.shuffleOptions ? shuffle(options, options.length + 1) : options;
  }, [question.options, question.shuffleOptions]);
}


/** Convierte una URL de YouTube en su forma incrustable. */
function toEmbedUrl(url: string): string {
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

export function QuestionField({
  question,
  value,
  onChange,
  error,
  accent,
  documentSummary,
  disabled,
  cardClassName,
  optionStyle = "card",
}: Props) {
  const options = useOptions(question);
  const [otherText, setOtherText] = useState("");
  const [uploading, setUploading] = useState(false);

  const radioStyle = { accentColor: accent };

  function renderChoice() {
    const selected = typeof value === "string" ? value : "";
    const isCardMode = optionStyle === "card";

    return (
      <div className={clsx("space-y-2.5", isCardMode && "grid gap-2 sm:grid-cols-1 space-y-0")}>
        {options.map((option) => {
          const isSelected = option.isOther
            ? selected === otherText && otherText !== ""
            : selected === option.label;

          return (
            <label
              key={option.id}
              className={clsx(
                "flex cursor-pointer items-center gap-3 text-sm transition-all duration-150",
                isCardMode
                  ? clsx(
                      "apple-option-card",
                      isSelected && "apple-option-card-selected",
                    )
                  : "py-1",
              )}
            >
              <input
                type="radio"
                name={question.id}
                className="h-4.5 w-4.5 shrink-0"
                style={radioStyle}
                disabled={disabled}
                checked={isSelected}
                onChange={() => onChange(option.isOther ? otherText : option.label)}
              />
              {option.isOther ? (
                <span className="flex flex-1 items-center gap-2">
                  <span className="font-medium text-ink">Otro:</span>
                  <input
                    className="flex-1 rounded-lg border border-black/10 bg-white/60 px-2 py-1 text-xs outline-none focus:border-[#0071E3]"
                    value={otherText}
                    disabled={disabled}
                    placeholder="Escribe tu opcion..."
                    onChange={(e) => {
                      setOtherText(e.target.value);
                      onChange(e.target.value);
                    }}
                  />
                </span>
              ) : (
                <span className={clsx(isSelected ? "font-medium text-ink" : "text-ink/85")}>
                  {option.label}
                </span>
              )}
            </label>
          );
        })}
      </div>
    );
  }

  function renderCheckboxes() {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    const isCardMode = optionStyle === "card";
    const toggle = (label: string) =>
      onChange(selected.includes(label) ? selected.filter((v) => v !== label) : [...selected, label]);

    return (
      <div className={clsx("space-y-2.5", isCardMode && "grid gap-2 sm:grid-cols-1 space-y-0")}>
        {options.map((option) => {
          const isSelected = option.isOther
            ? selected.includes(otherText) && otherText !== ""
            : selected.includes(option.label);

          return (
            <label
              key={option.id}
              className={clsx(
                "flex cursor-pointer items-center gap-3 text-sm transition-all duration-150",
                isCardMode
                  ? clsx(
                      "apple-option-card",
                      isSelected && "apple-option-card-selected",
                    )
                  : "py-1",
              )}
            >
              <input
                type="checkbox"
                className="h-4.5 w-4.5 shrink-0"
                style={radioStyle}
                disabled={disabled}
                checked={isSelected}
                onChange={() => toggle(option.isOther ? otherText : option.label)}
              />
              {option.isOther ? (
                <span className="flex flex-1 items-center gap-2">
                  <span className="font-medium text-ink">Otro:</span>
                  <input
                    className="flex-1 rounded-lg border border-black/10 bg-white/60 px-2 py-1 text-xs outline-none focus:border-[#0071E3]"
                    value={otherText}
                    disabled={disabled}
                    placeholder="Escribe tu opcion..."
                    onChange={(e) => {
                      const next = selected.filter((v) => v !== otherText);
                      setOtherText(e.target.value);
                      onChange(e.target.value ? [...next, e.target.value] : next);
                    }}
                  />
                </span>
              ) : (
                <span className={clsx(isSelected ? "font-medium text-ink" : "text-ink/85")}>
                  {option.label}
                </span>
              )}
            </label>
          );
        })}
      </div>
    );
  }

  function renderScale() {
    const scale = question.scale ?? { min: 1, max: 5, minLabel: "", maxLabel: "" };
    const steps = Array.from({ length: scale.max - scale.min + 1 }, (_, i) => scale.min + i);
    return (
      <div className="flex flex-wrap items-end gap-4">
        {scale.minLabel && <span className="pb-1.5 text-sm text-muted">{scale.minLabel}</span>}
        {steps.map((step) => (
          <label key={step} className="flex w-9 cursor-pointer flex-col items-center gap-1.5 text-sm">
            {step}
            <input
              type="radio"
              name={question.id}
              className="h-4 w-4"
              style={radioStyle}
              disabled={disabled}
              checked={value === String(step)}
              onChange={() => onChange(String(step))}
            />
          </label>
        ))}
        {scale.maxLabel && <span className="pb-1.5 text-sm text-muted">{scale.maxLabel}</span>}
      </div>
    );
  }

  function renderRating() {
    const config = question.rating ?? { max: 5, icon: "star" as const };
    const current = Number(value) || 0;
    const Icon = config.icon === "heart" ? Heart : config.icon === "thumb" ? ThumbsUp : Star;
    return (
      <div className="flex items-center gap-1.5">
        {Array.from({ length: config.max }, (_, i) => i + 1).map((step) => (
          <button
            key={step}
            type="button"
            disabled={disabled}
            aria-label={`${step} de ${config.max}`}
            onClick={() => onChange(String(step))}
            className="rounded p-1 transition-transform hover:scale-110"
          >
            <Icon
              size={26}
              strokeWidth={1.6}
              style={{ color: step <= current ? accent : "var(--color-line)" }}
              fill={step <= current ? accent : "none"}
            />
          </button>
        ))}
      </div>
    );
  }

  function renderGrid() {
    const grid = (value ?? {}) as Record<string, string | string[]>;
    const isCheckbox = question.type === "grid_checkbox";
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr>
              <th className="w-1/3" />
              {(question.columns ?? []).map((col) => (
                <th key={col.id} className="px-2 pb-3 text-center font-normal text-muted">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(question.rows ?? []).map((row, index) => (
              <tr key={row.id} className={index % 2 ? "bg-brand-tint" : ""}>
                <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                  {row.label}
                </th>
                {(question.columns ?? []).map((col) => {
                  const cell = grid[row.id];
                  const checked = isCheckbox
                    ? Array.isArray(cell) && cell.includes(col.label)
                    : cell === col.label;
                  return (
                    <td key={col.id} className="px-2 py-2.5 text-center">
                      <input
                        type={isCheckbox ? "checkbox" : "radio"}
                        name={`${question.id}-${row.id}`}
                        className="h-4 w-4"
                        style={radioStyle}
                        disabled={disabled}
                        checked={checked}
                        onChange={() => {
                          const next = { ...grid };
                          if (isCheckbox) {
                            const list = Array.isArray(cell) ? [...cell] : [];
                            next[row.id] = list.includes(col.label)
                              ? list.filter((v) => v !== col.label)
                              : [...list, col.label];
                          } else {
                            next[row.id] = col.label;
                          }
                          onChange(next);
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  async function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(files.map((f) => dataSource.uploadFile(f, question.id)));
      const current = Array.isArray(value) ? (value as UploadedFile[]) : [];
      onChange([...current, ...uploaded]);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function renderUpload() {
    const files = (Array.isArray(value) ? value : []) as UploadedFile[];
    const config = question.fileUpload;
    return (
      <div className="space-y-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium transition-colors hover:bg-brand-tint">
          <Paperclip size={16} />
          {uploading ? "Subiendo..." : "Anadir archivo"}
          <input
            type="file"
            multiple={(config?.maxFiles ?? 1) > 1}
            accept={config?.accept === "*/*" ? undefined : config?.accept}
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(e) => void onFiles(e)}
          />
        </label>
        {config && (
          <p className="text-xs text-muted">
            Maximo {config.maxFiles} archivo(s) de {config.maxSizeMb} MB cada uno.
          </p>
        )}
        <ul className="space-y-1.5">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between rounded-lg border border-line px-3 py-2 text-sm"
            >
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                aria-label={`Quitar ${file.name}`}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                className="text-muted hover:text-danger"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function renderBody() {
    switch (question.type) {
      case "short_text":
        return (
          <input
            className="w-full max-w-md rounded-xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-sm outline-none transition-all duration-150 placeholder:text-faint focus:border-[#0071E3] focus:bg-white focus:ring-2 focus:ring-[#0071E3]/20"
            placeholder="Escribe tu respuesta..."
            value={typeof value === "string" ? value : ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "paragraph":
        return (
          <textarea
            rows={3}
            className="w-full rounded-2xl border border-black/10 bg-white/80 px-3.5 py-2.5 text-sm outline-none transition-all duration-150 placeholder:text-faint focus:border-[#0071E3] focus:bg-white focus:ring-2 focus:ring-[#0071E3]/20"
            placeholder="Escribe tu respuesta detallada..."
            value={typeof value === "string" ? value : ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "multiple_choice":
        return renderChoice();
      case "checkboxes":
        return renderCheckboxes();
      case "dropdown":
        return (
          <Select
            value={typeof value === "string" ? value : ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
            className="w-full max-w-xs"
          >
            <option value="">Elige</option>
            {options.map((option) => (
              <option key={option.id} value={option.label}>
                {option.label}
              </option>
            ))}
          </Select>
        );
      case "linear_scale":
        return renderScale();
      case "rating":
        return renderRating();
      case "grid_multiple_choice":
      case "grid_checkbox":
        return renderGrid();
      case "date":
        return (
          <TextField
            type="date"
            className="max-w-xs"
            value={typeof value === "string" ? value : ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "time":
        return (
          <TextField
            type="time"
            className="max-w-xs"
            value={typeof value === "string" ? value : ""}
            disabled={disabled}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "file_upload":
        return renderUpload();
      case "signature":
        return (
          <SignaturePad
            question={question}
            value={(value as SignatureValue) ?? null}
            onChange={(signature) => onChange(signature)}
            documentSummary={documentSummary}
            accent={accent}
            disabled={disabled}
          />
        );
      default:
        return null;
    }
  }

  return (
    <div className={clsx("lf-card p-6 sm:p-7 transition-all duration-200", cardClassName, error && "border-danger ring-1 ring-danger")}>
      <h3 className="text-base font-semibold leading-snug tracking-tight text-ink">
        {question.title}
        {question.required && (
          <span className="ml-1 text-danger" aria-hidden>
            *
          </span>
        )}
      </h3>
      {question.showDescription && question.description && (
        <p className="mt-1 text-sm text-muted">{question.description}</p>
      )}
      {question.media?.type === "image" && question.media.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={question.media.url} alt="" className="mt-4 max-h-72 rounded-lg border border-line" />
      )}
      {question.media?.type === "video" && question.media.url && (
        <iframe
          src={toEmbedUrl(question.media.url)}
          title={question.title}
          allowFullScreen
          className="mt-4 aspect-video w-full max-w-xl rounded-lg border border-line"
        />
      )}
      <div className="mt-5">{renderBody()}</div>
      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
