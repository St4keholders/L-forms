"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDownToLine,
  GripHorizontal,
  Image as ImageIcon,
  MoreVertical,
  PlusCircle,
  Rows3,
  Type,
  Youtube,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ImportQuestionsDialog } from "./ImportQuestionsDialog";
import { MediaUrlDialog } from "./MediaUrlDialog";
import { QuestionCard } from "./QuestionCard";
import clsx from "clsx";
import { IconButton, Select } from "@/components/ui";
import { getThemeCardClass, RADIUS_CLASS } from "@/lib/theme";
import { NEXT_SECTION, SUBMIT_FORM, type Question } from "@/lib/types";
import { useEditor } from "@/store/editor";

function SortableQuestion({
  question,
  sectionId,
  active,
  onActivate,
}: {
  question: Question;
  sectionId: string;
  active: boolean;
  onActivate: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
    >
      <QuestionCard
        question={question}
        sectionId={sectionId}
        active={active}
        onActivate={onActivate}
        dragHandle={
          active ? (
            <button
              type="button"
              className="cursor-grab px-3 text-line hover:text-muted"
              aria-label="Reordenar pregunta"
              {...attributes}
              {...listeners}
            >
              <GripHorizontal size={16} />
            </button>
          ) : undefined
        }
      />
    </div>
  );
}

function SectionHeader({ sectionId, index, total }: { sectionId: string; index: number; total: number }) {
  const form = useEditor((s) => s.form)!;
  const updateSection = useEditor((s) => s.updateSection);
  const deleteSection = useEditor((s) => s.deleteSection);
  const moveSection = useEditor((s) => s.moveSection);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const section = form.sections[index];

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const cardCombinedClass = getThemeCardClass(form.theme);

  return (
    <div
      className={clsx("lf-card p-6 transition-all duration-300", cardCombinedClass)}
      style={{ borderLeftColor: form.theme.primaryColor, borderLeftWidth: 4 }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-muted">
          Seccion {index + 1} de {total}
        </p>
        <div className="relative">
          <IconButton label="Opciones de la seccion" onClick={() => setMenuOpen((v) => !v)}>
            <MoreVertical size={18} />
          </IconButton>
          {menuOpen && (
            <div ref={menuRef} className="lf-card absolute right-0 z-20 mt-1 w-56 overflow-hidden py-1 text-sm">
              <button
                type="button"
                disabled={index === 0}
                className="block w-full px-4 py-2 text-left hover:bg-brand-tint disabled:opacity-40"
                onClick={() => moveSection(index, index - 1)}
              >
                Mover hacia arriba
              </button>
              <button
                type="button"
                disabled={index === total - 1}
                className="block w-full px-4 py-2 text-left hover:bg-brand-tint disabled:opacity-40"
                onClick={() => moveSection(index, index + 1)}
              >
                Mover hacia abajo
              </button>
              <button
                type="button"
                disabled={total <= 1}
                className="block w-full px-4 py-2 text-left text-danger hover:bg-red-50 disabled:opacity-40"
                onClick={() => deleteSection(sectionId)}
              >
                Eliminar seccion
              </button>
            </div>
          )}
        </div>
      </div>

      <input
        value={section.title}
        onChange={(e) => updateSection(sectionId, { title: e.target.value })}
        aria-label="Titulo de la seccion"
        className="mt-2 w-full rounded-sm px-1 py-1 text-xl outline-none hover:bg-brand-tint focus:bg-brand-tint"
      />
      <input
        value={section.description ?? ""}
        onChange={(e) => updateSection(sectionId, { description: e.target.value })}
        placeholder="Descripcion de la seccion"
        aria-label="Descripcion de la seccion"
        className="lf-underline mt-1 w-full bg-transparent px-1 py-1 text-sm outline-none"
      />

      {total > 1 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3 text-sm">
          <span className="text-muted">Al terminar esta seccion</span>
          <Select
            value={section.nextSection ?? NEXT_SECTION}
            onChange={(e) => updateSection(sectionId, { nextSection: e.target.value })}
            aria-label="Seccion siguiente"
          >
            <option value={NEXT_SECTION}>Continuar a la siguiente seccion</option>
            {form.sections.map((s, i) => (
              <option key={s.id} value={s.id}>
                Ir a la seccion {i + 1}: {s.title}
              </option>
            ))}
            <option value={SUBMIT_FORM}>Enviar el formulario</option>
          </Select>
        </div>
      )}
    </div>
  );
}

export function QuestionsTab() {
  const form = useEditor((s) => s.form);
  const activeId = useEditor((s) => s.activeId);
  const setActive = useEditor((s) => s.setActive);
  const update = useEditor((s) => s.update);
  const addQuestion = useEditor((s) => s.addQuestion);
  const addSection = useEditor((s) => s.addSection);
  const moveQuestion = useEditor((s) => s.moveQuestion);
  const updateQuestion = useEditor((s) => s.updateQuestion);
  const [importOpen, setImportOpen] = useState(false);
  const [mediaDialog, setMediaDialog] = useState<{
    open: boolean;
    type: "image" | "video";
    targetQuestionId: string;
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (!form) return null;

  /** Seccion donde caen las acciones de la barra lateral. */
  const targetSectionId =
    form.sections.find((s) => s.questions.some((q) => q.id === activeId))?.id ??
    (form.sections.find((s) => s.id === activeId)?.id ?? form.sections[form.sections.length - 1].id);

  const activeQuestionId = form.sections
    .flatMap((s) => s.questions)
    .find((q) => q.id === activeId)?.id;

  function onDragEnd(event: DragEndEvent, sectionId: string) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const section = form!.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const from = section.questions.findIndex((q) => q.id === active.id);
    const to = section.questions.findIndex((q) => q.id === over.id);
    if (from !== -1 && to !== -1) moveQuestion(sectionId, from, to);
  }

  function attachMedia(type: "image" | "video") {
    let qId = activeQuestionId;
    if (!qId) {
      const targetSec = form!.sections.find((s) => s.id === targetSectionId);
      if (targetSec && targetSec.questions.length > 0) {
        qId = targetSec.questions[0].id;
      }
    }
    if (qId) {
      setMediaDialog({ open: true, type, targetQuestionId: qId });
    } else {
      // Si no hay preguntas en la sección, añadimos una primero
      addQuestion(targetSectionId);
    }
  }

  const tools = [
    { icon: PlusCircle, label: "Anadir pregunta", onClick: () => addQuestion(targetSectionId, activeQuestionId) },
    { icon: ArrowDownToLine, label: "Importar preguntas", onClick: () => setImportOpen(true) },
    {
      icon: Type,
      label: "Anadir titulo y descripcion",
      onClick: () => {
        addSection(targetSectionId);
      },
    },
    { icon: ImageIcon, label: "Anadir imagen", onClick: () => attachMedia("image") },
    { icon: Youtube, label: "Anadir video", onClick: () => attachMedia("video") },
    { icon: Rows3, label: "Anadir seccion", onClick: () => addSection(targetSectionId) },
  ];

  const cardCombinedClass = getThemeCardClass(form.theme);

  return (
    <div className="mx-auto flex w-full max-w-3xl gap-4 px-4 py-8">
      <div className="min-w-0 flex-1 space-y-4">
        {/* Encabezado del formulario */}
        <div
          className={clsx(
            "lf-card overflow-hidden transition-all duration-300 hover:shadow-md",
            cardCombinedClass,
            activeId === "form-header" && "ring-2 ring-offset-2",
          )}
          style={{
            ...(activeId === "form-header" ? ({ "--tw-ring-color": form.theme.primaryColor } as React.CSSProperties) : {}),
          }}
          onClick={() => setActive("form-header")}
          role="presentation"
        >
          <div className="h-2" style={{ backgroundColor: form.theme.primaryColor }} />
          <div className="p-7">
            <input
              value={form.title}
              onChange={(e) => update((draft) => void (draft.title = e.target.value), false)}
              aria-label="Titulo del formulario"
              className="w-full rounded-xl px-1.5 py-1 text-2xl font-bold tracking-tight outline-none transition-colors hover:bg-black/[0.03] focus:bg-black/[0.03]"
            />
            <input
              value={form.description}
              onChange={(e) => update((draft) => void (draft.description = e.target.value), false)}
              placeholder="Descripcion del formulario"
              aria-label="Descripcion del formulario"
              className="lf-underline mt-2.5 w-full bg-transparent px-1.5 py-1 text-sm text-muted outline-none placeholder:text-faint"
            />
          </div>
        </div>

        {form.sections.map((section, index) => (
          <div key={section.id} className="space-y-4">
            {form.sections.length > 1 && (
              <SectionHeader sectionId={section.id} index={index} total={form.sections.length} />
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(event) => onDragEnd(event, section.id)}
            >
              <SortableContext
                items={section.questions.map((q) => q.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-4">
                  {section.questions.map((question) => (
                    <SortableQuestion
                      key={question.id}
                      question={question}
                      sectionId={section.id}
                      active={activeId === question.id}
                      onActivate={() => setActive(question.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {section.questions.length === 0 && (
              <button
                type="button"
                onClick={() => addQuestion(section.id)}
                className={clsx(
                  "w-full border-2 border-dashed border-black/15 bg-white/40 p-8 text-center text-sm font-medium text-muted transition-all backdrop-blur-sm hover:border-[#0071E3] hover:text-[#0071E3]",
                  RADIUS_CLASS[form.theme.borderRadius ?? "lg"] || "radius-lg",
                )}
              >
                Esta seccion no tiene preguntas. Toca para anadir la primera.
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Barra de herramientas flotante */}
      <aside className="sticky top-28 h-fit">
        <div className="liquid-glass flex flex-col items-center gap-1.5 rounded-full p-1.5 shadow-xl">
          {tools.map((tool) => (
            <IconButton key={tool.label} label={tool.label} onClick={tool.onClick}>
              <tool.icon size={18} />
            </IconButton>
          ))}
        </div>
      </aside>

      <ImportQuestionsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        targetSectionId={targetSectionId}
      />

      {mediaDialog && (
        <MediaUrlDialog
          open={mediaDialog.open}
          type={mediaDialog.type}
          accentColor={form.theme.primaryColor}
          onClose={() => setMediaDialog(null)}
          onConfirm={(url) => {
            updateQuestion(mediaDialog.targetQuestionId, { media: { type: mediaDialog.type, url } });
            setMediaDialog(null);
          }}
        />
      )}
    </div>
  );
}
