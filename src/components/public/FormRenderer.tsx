"use client";

import clsx from "clsx";
import { useMemo, useState } from "react";
import { QuestionField } from "./QuestionField";
import { AmbientOrbs, Button, TextField } from "@/components/ui";
import { dataSource } from "@/lib/data";
import { uid } from "@/lib/id";
import { gradeResponse, resolveNextSection, shuffle, validateSection } from "@/lib/logic";
import { getSheetsProvider } from "@/lib/sheets/provider";
import {
  CARD_STYLE_CLASS,
  FONT_CLASS,
  PATTERN_CLASS,
  RADIUS_CLASS,
  getThemeCardClass,
} from "@/lib/theme";
import { SUBMIT_FORM, type AnswerValue, type FormDoc, type ResponseDoc } from "@/lib/types";

interface Props {
  form: FormDoc;
  /** En modo vista previa no se guarda nada. */
  preview?: boolean;
  onSubmitted?: (response: ResponseDoc) => void;
}

export function FormRenderer({ form, preview = false, onSubmitted }: Props) {
  const [sectionId, setSectionId] = useState(form.sections[0]?.id ?? "");
  const [trail, setTrail] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score?: number; totalPoints?: number } | null>(null);

  const accent = form.theme.primaryColor;
  const cardStyle = form.theme.cardStyle ?? "apple-clean";
  const borderRadius = form.theme.borderRadius ?? "lg";
  const buttonShape = form.theme.buttonShape ?? "pill";
  const pattern = form.theme.backgroundPattern ?? "none";

  const cardCombinedClass = getThemeCardClass(form.theme);

  const section = form.sections.find((s) => s.id === sectionId) ?? form.sections[0];
  const sectionIndex = form.sections.findIndex((s) => s.id === section?.id);
  const isLastSection = sectionIndex === form.sections.length - 1;

  const questions = useMemo(() => {
    if (!section) return [];
    return form.settings.shuffleQuestions
      ? shuffle(section.questions, section.questions.length + 3)
      : section.questions;
  }, [section, form.settings.shuffleQuestions]);

  /** Resumen textual del formulario; entra en el hash de las firmas. */
  const documentSummary = useMemo(
    () =>
      `${form.title}|${form.sections
        .flatMap((s) => s.questions.map((q) => q.title))
        .join("|")}`,
    [form],
  );

  const progress = form.sections.length > 1 ? ((sectionIndex + 1) / form.sections.length) * 100 : 0;

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => {
      if (!prev[questionId]) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  function validateCurrent(): boolean {
    if (!section) return false;
    const found = validateSection(form, section.id, answers);
    setErrors(found);
    let ok = Object.keys(found).length === 0;

    if (form.settings.collectEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Escribe un correo valido.");
      ok = false;
    } else {
      setEmailError(null);
    }

    if (!ok) window.scrollTo({ top: 0, behavior: "smooth" });
    return ok;
  }

  function goNext() {
    if (!section || !validateCurrent()) return;
    const target = resolveNextSection(form, section.id, answers);
    if (target === SUBMIT_FORM) {
      void submit();
      return;
    }
    setTrail((prev) => [...prev, section.id]);
    setSectionId(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    const previous = trail[trail.length - 1];
    if (!previous) return;
    setTrail((prev) => prev.slice(0, -1));
    setSectionId(previous);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (!validateCurrent()) return;
    const grading = form.settings.isQuiz ? gradeResponse(form, answers) : null;

    const response: ResponseDoc = {
      id: uid("res"),
      formId: form.id,
      submittedAt: new Date().toISOString(),
      respondentEmail: form.settings.collectEmail ? email : undefined,
      answers,
      score: grading?.score,
      totalPoints: grading?.totalPoints,
    };

    if (preview) {
      setResult(grading ?? {});
      return;
    }

    setSending(true);
    setSendError(null);
    try {
      await dataSource.createResponse(response);
      // Reservado: volcado de la respuesta a la hoja de calculo de Drive.
      await getSheetsProvider().appendResponse(form, response);
      setResult(grading ?? {});
      onSubmitted?.(response);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : "No se pudo enviar la respuesta.");
    } finally {
      setSending(false);
    }
  }

  function restart() {
    setAnswers({});
    setErrors({});
    setEmail("");
    setResult(null);
    setTrail([]);
    setSectionId(form.sections[0]?.id ?? "");
  }

  /* ---------------- Pantalla de confirmacion ---------------- */

  if (result) {
    return (
      <div className={clsx("relative mx-auto w-full max-w-3xl px-4 py-12", FONT_CLASS[form.theme.font] || "font-theme-sf-pro", PATTERN_CLASS[pattern])}>
        <AmbientOrbs accentColor={accent} pattern={pattern} />
        <div className={clsx("relative z-10 lf-card overflow-hidden", cardCombinedClass)}>
          <div className="h-2" style={{ backgroundColor: accent }} />
          <div className="p-8 sm:p-10">
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{form.title}</h1>
            <p className="mt-4 text-sm text-muted">{form.settings.confirmationMessage}</p>

            {form.settings.isQuiz &&
              form.settings.quiz.showPoints &&
              result.totalPoints !== undefined && (
                <p className="mt-5 rounded-2xl border border-black/[0.08] bg-black/[0.03] px-4 py-3 text-sm font-medium">
                  Puntuacion: <strong>{result.score}</strong> de {result.totalPoints} puntos.
                </p>
              )}

            {preview && (
              <p className="mt-5 rounded-2xl border border-black/[0.08] bg-black/[0.03] px-4 py-3 text-sm font-medium text-muted">
                Es una vista previa: esta respuesta no se ha guardado.
              </p>
            )}

            {form.settings.showAnotherResponseLink && (
              <button
                type="button"
                onClick={restart}
                className="mt-6 text-sm font-semibold underline underline-offset-4"
                style={{ color: accent }}
              >
                Enviar otra respuesta
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- Formulario ---------------- */

  return (
    <div
      className={clsx(
        "relative mx-auto w-full max-w-3xl px-4 py-8 min-h-screen",
        FONT_CLASS[form.theme.font ?? "sf-pro"] || "font-theme-sf-pro",
        PATTERN_CLASS[pattern],
      )}
      style={{
        ["--color-brand" as string]: accent,
        ["--glow-color" as string]: `${accent}45`,
      }}
    >
      <AmbientOrbs accentColor={accent} pattern={pattern} />
      <div className="relative z-10">
      {form.settings.showProgressBar && form.sections.length > 1 && (
        <div className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
          <div
            className="h-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%`, backgroundColor: accent }}
          />
        </div>
      )}

      {sectionIndex === 0 && (
        <div className={clsx("lf-card mb-5 overflow-hidden", cardCombinedClass)}>
          <div className="h-2" style={{ backgroundColor: accent }} />
          {form.theme.headerImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.theme.headerImage} alt="" className="max-h-48 w-full object-cover" />
          )}
          <div className="p-7 sm:p-9">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-ink sm:text-3xl">{form.title}</h1>
            {form.description && <p className="mt-3 text-sm text-muted leading-relaxed">{form.description}</p>}
            {form.settings.isQuiz && (
              <p className="mt-3 text-xs font-medium text-muted">Este formulario es un cuestionario con puntuacion.</p>
            )}
            {form.sections.some((s) => s.questions.some((q) => q.required)) && (
              <p className="mt-4 border-t border-black/[0.06] pt-3 text-xs font-medium text-danger">
                * Indica que la pregunta es obligatoria
              </p>
            )}
          </div>
        </div>
      )}

      {form.settings.collectEmail && sectionIndex === 0 && (
        <div className={clsx("lf-card mb-5 p-7", cardCombinedClass)}>
          <label htmlFor="respondent-email" className="block text-sm font-semibold tracking-tight text-ink">
            Correo electronico <span className="text-danger">*</span>
          </label>
          <TextField
            id="respondent-email"
            type="email"
            className="mt-3 max-w-md"
            value={email}
            invalid={Boolean(emailError)}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
          />
          {emailError && (
            <p role="alert" className="mt-2 text-xs font-medium text-danger">
              {emailError}
            </p>
          )}
        </div>
      )}

      {form.sections.length > 1 && section && (
        <div className={clsx("lf-card mb-5 p-7", cardCombinedClass)} style={{ borderLeftColor: accent, borderLeftWidth: 5 }}>
          <p className="text-xs font-medium text-muted">
            Seccion {sectionIndex + 1} de {form.sections.length}
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-ink">{section.title}</h2>
          {section.description && <p className="mt-1.5 text-sm text-muted">{section.description}</p>}
        </div>
      )}

      <div className="space-y-4">
        {questions.map((question) => (
          <QuestionField
            key={question.id}
            question={question}
            value={answers[question.id] ?? null}
            onChange={(value) => setAnswer(question.id, value)}
            error={errors[question.id]}
            accent={accent}
            documentSummary={documentSummary}
            cardClassName={cardCombinedClass}
            optionStyle={form.theme.optionStyle}
          />
        ))}
      </div>

      {sendError && (
        <p role="alert" className="mt-4 rounded-2xl border border-danger/30 bg-red-50 p-4 text-sm font-medium text-danger">
          {sendError}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2.5">
          {trail.length > 0 && (
            <Button
              type="button"
              shape={buttonShape as "pill" | "rounded"}
              onClick={goBack}
            >
              Atras
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            shape={buttonShape as "pill" | "rounded"}
            disabled={sending}
            onClick={isLastSection ? () => void submit() : goNext}
            style={{ backgroundColor: accent, borderColor: accent }}
          >
            {sending ? "Enviando..." : isLastSection ? "Enviar" : "Siguiente"}
          </Button>
        </div>
        <button
          type="button"
          onClick={restart}
          className="text-xs font-medium text-muted underline underline-offset-4 transition-colors hover:text-ink"
        >
          Borrar formulario
        </button>
      </div>

      <p className="mt-10 text-center text-xs text-faint">
        Creado con L-Forms
      </p>
      </div>
    </div>
  );
}
