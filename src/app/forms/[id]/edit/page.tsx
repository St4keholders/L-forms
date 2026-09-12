"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { EditorHeader, type EditorTab } from "@/components/editor/EditorHeader";
import { QuestionsTab } from "@/components/editor/QuestionsTab";
import { SettingsTab } from "@/components/editor/SettingsTab";
import { ShareDialog } from "@/components/editor/ShareDialog";
import { ThemePanel } from "@/components/editor/ThemePanel";
import { FormRenderer } from "@/components/public/FormRenderer";
import { ResponsesTab } from "@/components/responses/ResponsesTab";
import { AmbientOrbs, Button, IconButton, Spinner } from "@/components/ui";
import { useRequireAuth } from "@/lib/auth";
import { dataSource } from "@/lib/data";
import { FONT_CLASS, PATTERN_CLASS } from "@/lib/theme";
import type { ResponseDoc } from "@/lib/types";
import { useEditor } from "@/store/editor";

const AUTOSAVE_DELAY = 900;

export default function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useRequireAuth();
  const router = useRouter();

  const form = useEditor((s) => s.form);
  const dirty = useEditor((s) => s.dirty);
  const load = useEditor((s) => s.load);
  const save = useEditor((s) => s.save);
  const update = useEditor((s) => s.update);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);

  const [tab, setTab] = useState<EditorTab>("questions");
  const [responses, setResponses] = useState<ResponseDoc[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");
  const [themeOpen, setThemeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  /* Pestaña desde URL */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab");
      if (urlTab === "responses" || urlTab === "settings" || urlTab === "questions") {
        setTab(urlTab);
      }
    }
  }, []);

  /* Carga inicial */
  useEffect(() => {
    if (!user) return;
    let active = true;
    dataSource
      .getForm(id)
      .then((found) => {
        if (!active) return;
        if (!found) {
          setState("missing");
          return;
        }
        load(found);
        setState("ready");
      })
      .catch(() => active && setState("missing"));
    return () => {
      active = false;
    };
  }, [id, user, load]);

  const refreshResponses = useCallback(() => {
    dataSource.listResponses(id).then(setResponses).catch(() => setResponses([]));
  }, [id]);

  const refreshAll = useCallback(() => {
    refreshResponses();
    dataSource.getForm(id).then((f) => f && load(f)).catch(() => {});
  }, [id, refreshResponses, load]);

  useEffect(() => {
    if (state === "ready") refreshResponses();
  }, [state, refreshResponses]);

  /* Autoguardado */
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => void save(), AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [form, dirty, save]);

  /* Atajos de teclado */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const mod = event.metaKey || event.ctrlKey;
      if (!mod) return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo, save]);

  async function togglePublish() {
    const published = form?.status === "published";
    update((draft) => void (draft.status = published ? "draft" : "published"));
    await save();
    if (!published) setShareOpen(true);
  }

  async function remove() {
    if (!form) return;
    if (!window.confirm(`Mover "${form.title}" a la papelera?`)) return;
    await dataSource.deleteForm(form.id);
    router.push("/forms");
  }

  if (loading || state === "loading" || !user) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Spinner label="Abriendo el editor" />
      </main>
    );
  }

  if (state === "missing" || !form) {
    return (
      <main className="grid min-h-screen place-items-center px-5">
        <div className="lf-card max-w-md p-8 text-center">
          <h1 className="text-xl font-medium">No encontramos este formulario</h1>
          <p className="mt-2 text-sm text-muted">
            Puede que se haya eliminado o que el enlace este incompleto.
          </p>
          <Button variant="primary" className="mt-5" onClick={() => router.push("/forms")}>
            Volver a mis formularios
          </Button>
        </div>
      </main>
    );
  }

  const pattern = form.theme.backgroundPattern ?? "none";

  return (
    <div
      className={clsx(
        "relative min-h-screen transition-colors duration-300",
        FONT_CLASS[form.theme.font ?? "sf-pro"] || "font-theme-sf-pro",
        PATTERN_CLASS[pattern],
      )}
      style={{
        backgroundColor: form.theme.backgroundColor,
        ["--color-brand" as string]: form.theme.primaryColor,
        ["--glow-color" as string]: `${form.theme.primaryColor}45`,
      }}
    >
      <AmbientOrbs
        accentColor={form.theme.primaryColor}
        pattern={form.theme.backgroundPattern}
      />
      <div className="relative z-10">
        <EditorHeader
          tab={tab}
          onTabChange={(next) => {
            setTab(next);
            if (next === "responses") refreshResponses();
          }}
          responseCount={responses.length}
          onOpenTheme={() => setThemeOpen(true)}
          onOpenPreview={() => setPreviewOpen(true)}
          onOpenShare={() => setShareOpen(true)}
          onPublishToggle={() => void togglePublish()}
          onDelete={() => void remove()}
        />

        {tab === "questions" && <QuestionsTab />}
        {tab === "responses" && (
          <ResponsesTab form={form} responses={responses} onChanged={refreshAll} />
        )}
        {tab === "settings" && <SettingsTab />}

        <ThemePanel open={themeOpen} onClose={() => setThemeOpen(false)} />
        <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} />
      </div>

      {previewOpen && (
        <div
          className={clsx(
            "fixed inset-0 z-50 overflow-y-auto",
            FONT_CLASS[form.theme.font ?? "sf-pro"] || "font-theme-sf-pro",
            PATTERN_CLASS[pattern],
          )}
          style={{
            backgroundColor: form.theme.backgroundColor,
            ["--color-brand" as string]: form.theme.primaryColor,
            ["--glow-color" as string]: `${form.theme.primaryColor}45`,
          }}
        >
          <div className="sticky top-0 z-20 flex items-center justify-between border-b border-black/[0.06] bg-white/80 px-5 py-3 backdrop-blur-2xl">
            <p className="text-sm font-semibold tracking-tight text-ink">Vista previa</p>
            <IconButton label="Cerrar la vista previa" onClick={() => setPreviewOpen(false)}>
              <X size={18} />
            </IconButton>
          </div>
          <FormRenderer form={form} preview />
        </div>
      )}
    </div>
  );
}
