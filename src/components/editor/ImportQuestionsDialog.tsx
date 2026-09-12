"use client";

import { useEffect, useState } from "react";
import { Button, Modal, Spinner } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { dataSource } from "@/lib/data";
import { QUESTION_TYPES, type FormDoc, type Question } from "@/lib/types";
import { useEditor } from "@/store/editor";

interface Props {
  open: boolean;
  onClose: () => void;
  targetSectionId: string;
}

export function ImportQuestionsDialog({ open, onClose, targetSectionId }: Props) {
  const { user } = useAuth();
  const currentId = useEditor((s) => s.form?.id);
  const importQuestions = useEditor((s) => s.importQuestions);
  const [forms, setForms] = useState<FormDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState<FormDoc | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    setLoading(true);
    setSelectedForm(null);
    setPicked([]);
    dataSource
      .listForms(user.id)
      .then((list) => setForms(list.filter((f) => f.id !== currentId)))
      .finally(() => setLoading(false));
  }, [open, user, currentId]);

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function confirm() {
    if (!selectedForm) return;
    const questions: Question[] = selectedForm.sections
      .flatMap((s) => s.questions)
      .filter((q) => picked.includes(q.id));
    importQuestions(targetSectionId, questions);
    onClose();
  }

  const questions = selectedForm?.sections.flatMap((s) => s.questions) ?? [];

  return (
    <Modal open={open} onClose={onClose} title="Importar preguntas">
      {loading ? (
        <Spinner label="Cargando tus formularios" />
      ) : !selectedForm ? (
        <>
          <p className="text-sm text-muted">Elige el formulario del que quieres copiar preguntas.</p>
          {forms.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Todavia no tienes otros formularios de los que importar.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line">
              {forms.map((form) => (
                <li key={form.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedForm(form)}
                    className="block w-full px-4 py-3 text-left text-sm hover:bg-brand-tint"
                  >
                    <span className="block font-medium">{form.title}</span>
                    <span className="block text-xs text-muted">
                      {form.sections.flatMap((s) => s.questions).length} preguntas
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{selectedForm.title}</p>
            <button
              type="button"
              onClick={() => setSelectedForm(null)}
              className="text-sm text-brand hover:underline"
            >
              Cambiar
            </button>
          </div>

          <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto lf-scroll">
            {questions.map((question) => (
              <li key={question.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 text-sm hover:bg-brand-tint">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-brand"
                    checked={picked.includes(question.id)}
                    onChange={() => toggle(question.id)}
                  />
                  <span>
                    <span className="block">{question.title}</span>
                    <span className="block text-xs text-muted">
                      {QUESTION_TYPES.find((t) => t.type === question.type)?.label}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex justify-end gap-2">
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={confirm} disabled={picked.length === 0}>
              Importar {picked.length > 0 ? `(${picked.length})` : ""}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
