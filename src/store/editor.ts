"use client";

import { create } from "zustand";
import { dataSource } from "@/lib/data";
import { makeOption, makeQuestion, makeSection } from "@/lib/defaults";
import { uid } from "@/lib/id";
import { getSheetsProvider } from "@/lib/sheets/provider";
import type { FormDoc, Question, QuestionType, Section } from "@/lib/types";

type SaveState = "idle" | "saving" | "saved" | "error";

interface EditorState {
  form: FormDoc | null;
  past: FormDoc[];
  future: FormDoc[];
  /** Pregunta o seccion con la tarjeta expandida. */
  activeId: string | null;
  saveState: SaveState;
  dirty: boolean;

  load: (form: FormDoc) => void;
  setActive: (id: string | null) => void;
  update: (mutator: (draft: FormDoc) => void, pushHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  save: () => Promise<void>;

  addQuestion: (sectionId: string, afterQuestionId?: string, type?: QuestionType) => void;
  updateQuestion: (questionId: string, patch: Partial<Question>) => void;
  deleteQuestion: (questionId: string) => void;
  duplicateQuestion: (questionId: string) => void;
  moveQuestion: (sectionId: string, from: number, to: number) => void;
  importQuestions: (sectionId: string, questions: Question[]) => void;

  addSection: (afterSectionId?: string) => void;
  updateSection: (sectionId: string, patch: Partial<Section>) => void;
  deleteSection: (sectionId: string) => void;
  moveSection: (from: number, to: number) => void;
}

const clone = <T,>(value: T): T => structuredClone(value);

const HISTORY_LIMIT = 50;

/** Localiza una pregunta y su seccion dentro del formulario. */
function locate(form: FormDoc, questionId: string) {
  for (const section of form.sections) {
    const index = section.questions.findIndex((q) => q.id === questionId);
    if (index !== -1) return { section, index, question: section.questions[index] };
  }
  return null;
}

export const useEditor = create<EditorState>((set, get) => ({
  form: null,
  past: [],
  future: [],
  activeId: null,
  saveState: "idle",
  dirty: false,

  load: (form) => set({ form, past: [], future: [], activeId: null, dirty: false, saveState: "idle" }),

  setActive: (id) => set({ activeId: id }),

  update: (mutator, pushHistory = true) => {
    const current = get().form;
    if (!current) return;
    const draft = clone(current);
    mutator(draft);
    draft.updatedAt = new Date().toISOString();
    set((state) => ({
      form: draft,
      past: pushHistory ? [...state.past, current].slice(-HISTORY_LIMIT) : state.past,
      future: pushHistory ? [] : state.future,
      dirty: true,
    }));
  },

  undo: () => {
    const { past, form } = get();
    if (past.length === 0 || !form) return;
    const previous = past[past.length - 1];
    set((state) => ({
      form: previous,
      past: state.past.slice(0, -1),
      future: [form, ...state.future].slice(0, HISTORY_LIMIT),
      dirty: true,
    }));
  },

  redo: () => {
    const { future, form } = get();
    if (future.length === 0 || !form) return;
    const [next, ...rest] = future;
    set((state) => ({
      form: next,
      past: [...state.past, form].slice(-HISTORY_LIMIT),
      future: rest,
      dirty: true,
    }));
  },

  save: async () => {
    const form = get().form;
    if (!form) return;
    set({ saveState: "saving" });
    try {
      const saved = await dataSource.saveForm(form);
      // Mantiene sincronizada la hoja de calculo asociada (pendiente de implementar).
      await getSheetsProvider().syncHeaders(saved);
      set({ saveState: "saved", dirty: false });
    } catch {
      set({ saveState: "error" });
    }
  },

  addQuestion: (sectionId, afterQuestionId, type) => {
    const settings = get().form?.settings;
    const question = makeQuestion(type ?? "multiple_choice", settings?.defaultRequired ?? false);
    get().update((draft) => {
      const section = draft.sections.find((s) => s.id === sectionId);
      if (!section) return;
      const at = afterQuestionId
        ? section.questions.findIndex((q) => q.id === afterQuestionId) + 1
        : section.questions.length;
      section.questions.splice(at, 0, question);
    });
    set({ activeId: question.id });
  },

  updateQuestion: (questionId, patch) =>
    get().update((draft) => {
      const found = locate(draft, questionId);
      if (found) Object.assign(found.question, patch);
    }),

  deleteQuestion: (questionId) =>
    get().update((draft) => {
      const found = locate(draft, questionId);
      if (found) found.section.questions.splice(found.index, 1);
    }),

  duplicateQuestion: (questionId) => {
    const newId = uid("q");
    get().update((draft) => {
      const found = locate(draft, questionId);
      if (!found) return;
      const copy = clone(found.question);
      copy.id = newId;
      copy.options = copy.options?.map((o) => ({ ...o, id: uid("opt") }));
      copy.rows = copy.rows?.map((o) => ({ ...o, id: uid("opt") }));
      copy.columns = copy.columns?.map((o) => ({ ...o, id: uid("opt") }));
      copy.goToSection = undefined;
      found.section.questions.splice(found.index + 1, 0, copy);
    });
    set({ activeId: newId });
  },

  moveQuestion: (sectionId, from, to) =>
    get().update((draft) => {
      const section = draft.sections.find((s) => s.id === sectionId);
      if (!section) return;
      const [moved] = section.questions.splice(from, 1);
      section.questions.splice(to, 0, moved);
    }),

  importQuestions: (sectionId, questions) =>
    get().update((draft) => {
      const section = draft.sections.find((s) => s.id === sectionId);
      if (!section) return;
      for (const q of questions) {
        const copy = clone(q);
        copy.id = uid("q");
        copy.options = copy.options?.map((o) => ({ ...o, id: uid("opt") }));
        copy.rows = copy.rows?.map((o) => ({ ...o, id: uid("opt") }));
        copy.columns = copy.columns?.map((o) => ({ ...o, id: uid("opt") }));
        copy.goToSection = undefined;
        section.questions.push(copy);
      }
    }),

  addSection: (afterSectionId) => {
    const section = makeSection();
    section.questions = [];
    get().update((draft) => {
      const at = afterSectionId
        ? draft.sections.findIndex((s) => s.id === afterSectionId) + 1
        : draft.sections.length;
      section.title = `Seccion ${at + 1}`;
      draft.sections.splice(at, 0, section);
    });
    set({ activeId: section.id });
  },

  updateSection: (sectionId, patch) =>
    get().update((draft) => {
      const section = draft.sections.find((s) => s.id === sectionId);
      if (section) Object.assign(section, patch);
    }),

  deleteSection: (sectionId) =>
    get().update((draft) => {
      if (draft.sections.length <= 1) return;
      draft.sections = draft.sections.filter((s) => s.id !== sectionId);
      // Limpia rutas condicionales que apuntaban a la seccion eliminada.
      for (const section of draft.sections) {
        if (section.nextSection === sectionId) section.nextSection = undefined;
        for (const q of section.questions) {
          if (!q.goToSection) continue;
          for (const key of Object.keys(q.goToSection)) {
            if (q.goToSection[key] === sectionId) delete q.goToSection[key];
          }
        }
      }
    }),

  moveSection: (from, to) =>
    get().update((draft) => {
      const [moved] = draft.sections.splice(from, 1);
      draft.sections.splice(to, 0, moved);
    }),
}));

/** Anade una opcion a una pregunta de eleccion o a una cuadricula. */
export function addOption(
  question: Question,
  target: "options" | "rows" | "columns",
  isOther = false,
) {
  const list = question[target] ?? [];
  const label = isOther
    ? "Otro"
    : `${target === "columns" ? "Columna" : target === "rows" ? "Fila" : "Opcion"} ${list.length + 1}`;
  return [...list, makeOption(label, isOther)];
}
