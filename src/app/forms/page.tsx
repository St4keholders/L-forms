"use client";

import clsx from "clsx";
import {
  AlertTriangle,
  ArrowDownAZ,
  Check,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  LayoutGrid,
  List,
  MoreVertical,
  Search,
  Share2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TemplateGallery } from "@/components/home/TemplateGallery";
import { Button, EmptyState, IconButton, Logo, Modal, Spinner, TextField } from "@/components/ui";
import { useAuth, useRequireAuth } from "@/lib/auth";
import { dataSource } from "@/lib/data";
import { uid } from "@/lib/id";
import { getSheetsProvider } from "@/lib/sheets/provider";
import type { FormTemplate } from "@/lib/templates";
import type { FormDoc } from "@/lib/types";

type SortMode = "recent" | "name";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

export default function FormsHomePage() {
  const { user, loading } = useRequireAuth();
  const { signOut } = useAuth();
  const router = useRouter();

  const [forms, setForms] = useState<FormDoc[]>([]);
  const [fetching, setFetching] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<FormDoc | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [sharingForm, setSharingForm] = useState<FormDoc | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [deletingForm, setDeletingForm] = useState<FormDoc | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    setForms(await dataSource.listForms(user.id));
    setFetching(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuFor(null);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const visible = useMemo(() => {
    const filtered = forms.filter((f) => f.title.toLowerCase().includes(query.trim().toLowerCase()));
    return sort === "name"
      ? [...filtered].sort((a, b) => a.title.localeCompare(b.title))
      : [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [forms, query, sort]);

  const shareUrl = useMemo(() => {
    if (!sharingForm) return "";
    if (typeof window === "undefined") return `/f/${sharingForm.id}`;
    return `${window.location.origin}/f/${sharingForm.id}`;
  }, [sharingForm]);

  const copyShareLink = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  }, [shareUrl]);

  async function createFrom(template: FormTemplate) {
    if (!user) return;
    setBusyKey(template.key);
    const form = template.build(user.id);
    form.spreadsheetId = await getSheetsProvider().ensureSpreadsheet(form);
    await dataSource.saveForm(form);
    router.push(`/forms/${form.id}/edit`);
  }

  async function duplicate(form: FormDoc) {
    if (!user) return;
    const copy: FormDoc = {
      ...structuredClone(form),
      id: uid("form"),
      title: `Copia de ${form.title}`,
      status: "draft",
      spreadsheetId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await dataSource.saveForm(copy);
    setMenuFor(null);
    await refresh();
  }

  async function confirmPermanentDelete() {
    if (!deletingForm) return;
    setIsDeleting(true);
    try {
      await dataSource.deleteForm(deletingForm.id);
      setDeletingForm(null);
      await refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  async function confirmRename() {
    if (!renaming) return;
    await dataSource.saveForm({ ...renaming, title: renameValue.trim() || "Formulario sin titulo" });
    setRenaming(null);
    await refresh();
  }

  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center">
        <Spinner />
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
          <Link href="/forms" className="shrink-0">
            <Logo />
          </Link>
          <div className="relative mx-auto w-full max-w-xl">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-faint" />
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar formularios"
              className="bg-brand-tint pl-9"
              aria-label="Buscar formularios"
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden text-sm text-muted sm:block">{user.name}</span>
            <Button size="sm" onClick={() => void signOut()}>
              Salir
            </Button>
          </div>
        </div>
      </header>

      <TemplateGallery onPick={(t) => void createFrom(t)} busyKey={busyKey} />

      <main className="mx-auto max-w-6xl px-5 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-medium">Formularios recientes</h2>
          <div className="flex items-center gap-1">
            <IconButton
              label={sort === "recent" ? "Ordenar por nombre" : "Ordenar por fecha"}
              onClick={() => setSort(sort === "recent" ? "name" : "recent")}
            >
              {sort === "recent" ? <Clock size={18} /> : <ArrowDownAZ size={18} />}
            </IconButton>
            <IconButton
              label={view === "grid" ? "Ver como lista" : "Ver como cuadricula"}
              onClick={() => setView(view === "grid" ? "list" : "grid")}
            >
              {view === "grid" ? <List size={18} /> : <LayoutGrid size={18} />}
            </IconButton>
          </div>
        </div>

        {fetching ? (
          <div className="py-16">
            <Spinner label="Cargando formularios" />
          </div>
        ) : visible.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              title={query ? "Ningun formulario coincide" : "Aun no tienes formularios"}
              description={
                query
                  ? "Prueba con otras palabras o revisa la ortografia."
                  : "Elige una plantilla de arriba o empieza con un formulario en blanco."
              }
            />
          </div>
        ) : (
          <ul
            className={clsx(
              "mt-5",
              view === "grid"
                ? "grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4"
                : "divide-y divide-line rounded-lg border border-line bg-surface",
            )}
          >
            {visible.map((form) => (
              <li
                key={form.id}
                className={clsx(
                  view === "grid" ? "lf-card" : "",
                  menuFor === form.id ? "relative z-30" : "relative",
                )}
              >
                <div className={view === "grid" ? "" : "flex items-center gap-3 px-4 py-3"}>
                  <Link
                    href={`/forms/${form.id}/edit`}
                    className={clsx(
                      "block min-w-0 flex-1",
                      view === "grid" ? "border-b border-line bg-brand-tint p-4 rounded-t-[23px] overflow-hidden" : "",
                    )}
                  >
                    {view === "grid" && (
                      <span className="block h-24 rounded-sm border border-line bg-white p-2.5">
                        <span
                          className="block h-1.5 w-3/5 rounded-xs"
                          style={{ backgroundColor: form.theme.primaryColor }}
                        />
                        <span className="mt-2 block h-1 w-4/5 rounded-xs bg-line" />
                        <span className="mt-1.5 block h-1 w-2/3 rounded-xs bg-line" />
                        <span className="mt-1.5 block h-1 w-3/4 rounded-xs bg-line" />
                      </span>
                    )}
                    {view === "list" && (
                      <span className="flex items-center gap-3">
                        <FileText size={18} className="shrink-0 text-brand" />
                        <span className="truncate text-sm font-medium">{form.title}</span>
                      </span>
                    )}
                  </Link>

                  <div
                    className={clsx(
                      "flex items-center gap-2",
                      view === "grid" ? "px-4 py-3" : "shrink-0",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      {view === "grid" && (
                        <p className="truncate text-sm font-medium">{form.title}</p>
                      )}
                      <p className="truncate text-xs text-muted">
                        {form.status === "published" ? "Publicado" : "Borrador"} ·{" "}
                        {relativeTime(form.updatedAt)}
                      </p>
                    </div>
                    <div className="relative">
                      <IconButton
                        label="Más opciones"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuFor((current) => (current === form.id ? null : form.id));
                        }}
                      >
                        <MoreVertical size={18} />
                      </IconButton>
                      {menuFor === form.id && (
                        <div
                          ref={menuRef}
                          onMouseDown={(e) => e.stopPropagation()}
                          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-black/10 bg-white py-1.5 text-sm shadow-2xl ring-1 ring-black/5"
                        >
                          <Link
                            href={`/forms/${form.id}/edit`}
                            className="flex items-center gap-2.5 px-4 py-2 hover:bg-brand-tint text-ink"
                            onClick={() => setMenuFor(null)}
                          >
                            <FileText size={15} className="text-muted" />
                            <span>Abrir</span>
                          </Link>
                          <button
                            type="button"
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-left font-medium text-brand hover:bg-brand-tint"
                            onClick={() => {
                              setSharingForm(form);
                              setCopiedLink(false);
                              setMenuFor(null);
                            }}
                          >
                            <Share2 size={15} />
                            <span>Compartir</span>
                          </button>
                          <button
                            type="button"
                            className="block w-full px-4 py-2 text-left hover:bg-brand-tint text-ink"
                            onClick={() => {
                              setRenaming(form);
                              setRenameValue(form.title);
                              setMenuFor(null);
                            }}
                          >
                            Cambiar el nombre
                          </button>
                          <button
                            type="button"
                            className="block w-full px-4 py-2 text-left hover:bg-brand-tint text-ink"
                            onClick={() => void duplicate(form)}
                          >
                            Hacer una copia
                          </button>
                          <div className="my-1 border-t border-line" />
                          <button
                            type="button"
                            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-danger hover:bg-red-50 font-medium"
                            onClick={() => {
                              setDeletingForm(form);
                              setMenuFor(null);
                            }}
                          >
                            <Trash2 size={15} />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      {/* Modal: Cambiar nombre */}
      <Modal open={renaming !== null} onClose={() => setRenaming(null)} title="Cambiar el nombre">
        <TextField
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          autoFocus
          aria-label="Nuevo nombre del formulario"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={() => setRenaming(null)}>Cancelar</Button>
          <Button variant="primary" onClick={() => void confirmRename()}>
            Guardar
          </Button>
        </div>
      </Modal>

      {/* Modal: Compartir para responder (público) */}
      <Modal
        open={sharingForm !== null}
        onClose={() => {
          setSharingForm(null);
          setCopiedLink(false);
        }}
        title="Compartir formulario"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-ink font-medium">
              Enlace público para responder
            </p>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Copia este enlace para enviarlo a quienes van a responder el formulario.
              Este enlace es exclusivamente para responder, <strong>no otorga permisos de edición</strong>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <TextField
              value={shareUrl}
              readOnly
              className="flex-1 select-all font-mono text-xs bg-brand-tint border-line"
              aria-label="Enlace público para responder"
            />
            <Button
              variant={copiedLink ? "secondary" : "primary"}
              onClick={() => void copyShareLink()}
              className="shrink-0 gap-1.5"
            >
              {copiedLink ? (
                <>
                  <Check size={16} className="text-emerald-600" />
                  <span className="text-emerald-700 font-medium">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copiar enlace</span>
                </>
              )}
            </Button>
          </div>

          {sharingForm && (
            <div className="flex items-center justify-between border-t border-line pt-4">
              <a
                href={`/f/${sharingForm.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-brand hover:underline"
              >
                <ExternalLink size={14} />
                Abrir formulario en nueva pestaña
              </a>
              <Button onClick={() => setSharingForm(null)}>Cerrar</Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal: Confirmación de eliminación definitiva */}
      <Modal
        open={deletingForm !== null}
        onClose={() => {
          if (!isDeleting) setDeletingForm(null);
        }}
        title="¿Eliminar formulario definitivamente?"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/70 p-4 text-sm text-red-950">
            <AlertTriangle size={22} className="shrink-0 text-red-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-red-900">Esta acción no se puede deshacer</p>
              <p className="text-xs text-red-800 leading-relaxed">
                Se eliminará definitivamente el formulario{" "}
                <strong className="font-semibold text-red-950">&quot;{deletingForm?.title}&quot;</strong>{" "}
                junto con todas las preguntas y respuestas recopiladas.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2.5">
            <Button
              disabled={isDeleting}
              onClick={() => setDeletingForm(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={isDeleting}
              onClick={() => void confirmPermanentDelete()}
              className="bg-red-600 hover:bg-red-700 text-white font-medium border-red-600 gap-1.5"
            >
              {isDeleting ? (
                <>
                  <Spinner label="Eliminando..." />
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Eliminar definitivamente</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
