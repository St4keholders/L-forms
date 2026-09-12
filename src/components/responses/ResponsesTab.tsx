"use client";

import clsx from "clsx";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Link2,
  MoreVertical,
  RefreshCw,
  Sheet,
  Trash2,
  Unlink,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor } from "@/store/editor";

function GoogleIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );
}
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button, EmptyState, IconButton, Modal, Select, Spinner } from "@/components/ui";
import { downloadSignatureCertificate } from "@/lib/certificate";
import { downloadText, responsesToCsv } from "@/lib/csv";
import { dataSource } from "@/lib/data";
import { answerToText, formatDate } from "@/lib/format";
import { isSheetsEnabled } from "@/lib/sheets/provider";
import { getSupabase } from "@/lib/supabase/client";
import {
  CHOICE_TYPES,
  type FormDoc,
  type Question,
  type ResponseDoc,
  type SignatureValue,
} from "@/lib/types";

type View = "summary" | "question" | "individual";

const PALETTE = ["#4C3FD9", "#1F6F8B", "#2E7D5B", "#B4573C", "#C23E7B", "#7A4E2D", "#3E4C59"];

interface Props {
  form: FormDoc;
  responses: ResponseDoc[];
  onChanged: () => void;
}

/** Cuenta cuantas veces aparece cada valor en las respuestas de una pregunta. */
function tally(question: Question, responses: ResponseDoc[]) {
  const counts = new Map<string, number>();
  for (const response of responses) {
    const value = response.answers[question.id];
    const values = Array.isArray(value) ? (value as string[]) : [value];
    for (const item of values) {
      if (typeof item !== "string" || item === "") continue;
      counts.set(item, (counts.get(item) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

function SignaturePreview({
  form,
  question,
  response,
  signature,
}: {
  form: FormDoc;
  question: Question;
  response: ResponseDoc;
  signature: SignatureValue;
}) {
  return (
    <div className="rounded-lg border border-line p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={signature.imageUrl} alt={`Firma de ${signature.typedName}`} className="max-h-28" />
      <div className="mt-3 space-y-0.5 text-xs text-muted">
        <p>
          {signature.typedName || "Sin nombre escrito"} · {formatDate(signature.signedAt)}
        </p>
        <p>Huella {signature.hash.slice(0, 24)}...</p>
      </div>
      {question.signature?.certificate && (
        <Button
          size="sm"
          className="mt-3"
          onClick={() => downloadSignatureCertificate(form, question, response, signature)}
        >
          <Download size={15} /> Descargar certificado
        </Button>
      )}
    </div>
  );
}

export function ResponsesTab({ form, responses, onChanged }: Props) {
  const [view, setView] = useState<View>("summary");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [current, setCurrent] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  /* ---------- Estado de Google Sheets ---------- */
  const sheetsActive = isSheetsEnabled();
  const [sheetModal, setSheetModal] = useState(false);
  const [sheetBusy, setSheetBusy] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [googleStatus, setGoogleStatus] = useState<{
    isConfigured: boolean;
    isConnected: boolean;
    email: string | null;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncingHeaders, setSyncingHeaders] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  // Modo de vinculación: crear nueva o vincular existente
  const [linkMode, setLinkMode] = useState<"new" | "existing">("new");
  const [existingSheets, setExistingSheets] = useState<
    Array<{ id: string; name: string; url: string; modifiedTime?: string }>
  >([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [selectedSpreadsheetId, setSelectedSpreadsheetId] = useState<string>("");

  const isLinked = Boolean(form.spreadsheetId);

  // Construir la URL de la hoja cuando ya hay una vinculada
  useEffect(() => {
    if (form.spreadsheetId) {
      setSheetUrl(`https://docs.google.com/spreadsheets/d/${form.spreadsheetId}`);
    } else {
      setSheetUrl(null);
    }
  }, [form.spreadsheetId]);

  // Consultar estado de conexión de Google
  const checkGoogleStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/sheets/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = (await res.json()) as {
          isConfigured: boolean;
          isConnected: boolean;
          email: string | null;
        };
        setGoogleStatus(json);
      }
    } catch {
      // Silencioso
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // Cargar hojas de Google Drive del usuario
  const loadExistingSheets = useCallback(async () => {
    setLoadingSheets(true);
    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const res = await fetch("/api/sheets/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = (await res.json()) as {
          spreadsheets?: Array<{ id: string; name: string; url: string; modifiedTime?: string }>;
        };
        const list = json.spreadsheets || [];
        setExistingSheets(list);
        if (list.length > 0 && !selectedSpreadsheetId) {
          setSelectedSpreadsheetId(list[0].id);
        }
      }
    } catch {
      // Silencioso
    } finally {
      setLoadingSheets(false);
    }
  }, [selectedSpreadsheetId]);

  // Verificar retorno de OAuth desde la URL
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const googleParam = params.get("google");
    const googleErr = params.get("google_error");

    if (googleParam === "connected") {
      setSheetModal(true);
      setSyncNotice("¡Cuenta de Google Drive conectada con éxito!");
      void checkGoogleStatus();
      const url = new URL(window.location.href);
      url.searchParams.delete("google");
      window.history.replaceState({}, "", url.toString());
    } else if (googleErr) {
      setSheetModal(true);
      setSheetError(`Error al conectar con Google: ${decodeURIComponent(googleErr)}`);
      const url = new URL(window.location.href);
      url.searchParams.delete("google_error");
      window.history.replaceState({}, "", url.toString());
    }
  }, [checkGoogleStatus]);

  // Al abrir el modal, verificar estado y cargar lista si ya está conectado
  useEffect(() => {
    if (sheetModal && sheetsActive) {
      void checkGoogleStatus();
    }
  }, [sheetModal, sheetsActive, checkGoogleStatus]);

  useEffect(() => {
    if (sheetModal && googleStatus?.isConnected && linkMode === "existing" && existingSheets.length === 0) {
      void loadExistingSheets();
    }
  }, [sheetModal, googleStatus?.isConnected, linkMode, existingSheets.length, loadExistingSheets]);

  // Iniciar autorización de Google Drive
  const connectGoogle = useCallback(async () => {
    setSheetBusy(true);
    setSheetError(null);
    try {
      const { data } = await getSupabase().auth.getSession();
      const session = data.session;
      if (!session?.user?.id) throw new Error("No hay sesión de usuario activa.");

      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set("tab", "responses");
      const returnTo = currentUrl.pathname + currentUrl.search;

      const statePayload = {
        userId: session.user.id,
        returnTo,
      };
      const state = btoa(JSON.stringify(statePayload));
      window.location.href = `/api/auth/google?state=${encodeURIComponent(state)}`;
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : "Error iniciando conexión con Google.");
      setSheetBusy(false);
    }
  }, []);

  // Desconectar cuenta de Google Drive
  const disconnectGoogle = useCallback(async () => {
    if (!window.confirm("¿Deseas desconectar tu cuenta de Google Drive?")) return;
    setSheetBusy(true);
    setSheetError(null);
    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No hay sesión activa.");

      const res = await fetch("/api/sheets/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "disconnect_google" }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        throw new Error(json.error ?? "Error al desconectar.");
      }
      setGoogleStatus((prev) => (prev ? { ...prev, isConnected: false, email: null } : null));
      setExistingSheets([]);
      setSyncNotice("Cuenta de Google Drive desconectada.");
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : "No se pudo desconectar.");
    } finally {
      setSheetBusy(false);
    }
  }, []);

  // Vincular (crear o vincular existente)
  const linkSheet = useCallback(async () => {
    setSheetBusy(true);
    setSheetError(null);
    setSyncNotice(null);
    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No hay sesión activa.");

      const payload =
        linkMode === "existing"
          ? { formId: form.id, action: "link_existing" as const, spreadsheetId: selectedSpreadsheetId }
          : { formId: form.id, action: "create" as const };

      if (linkMode === "existing" && !selectedSpreadsheetId) {
        throw new Error("Por favor selecciona una hoja de cálculo.");
      }

      const res = await fetch("/api/sheets/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { spreadsheetId?: string; url?: string; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Error desconocido.");

      setSheetUrl(json.url ?? null);
      useEditor.getState().update((draft) => {
        draft.spreadsheetId = json.spreadsheetId ?? null;
      });
      setSheetModal(false);
      onChanged();
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : "No se pudo vincular la hoja.");
    } finally {
      setSheetBusy(false);
    }
  }, [form.id, linkMode, selectedSpreadsheetId, onChanged]);

  // Desvincular hoja
  const unlinkSheet = useCallback(async () => {
    if (!window.confirm("¿Seguro que deseas desvincular la hoja de cálculo de este formulario?")) return;
    setSheetBusy(true);
    setSheetError(null);
    setSyncNotice(null);
    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No hay sesión activa.");

      const res = await fetch("/api/sheets/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formId: form.id, action: "unlink" }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Error desconocido.");

      setSheetUrl(null);
      useEditor.getState().update((draft) => {
        draft.spreadsheetId = null;
      });
      setSheetModal(false);
      onChanged();
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : "No se pudo desvincular.");
    } finally {
      setSheetBusy(false);
    }
  }, [form.id, onChanged]);

  // Sincronizar encabezados
  const syncHeaders = useCallback(async () => {
    setSyncingHeaders(true);
    setSheetError(null);
    setSyncNotice(null);
    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No hay sesión activa.");

      const res = await fetch("/api/sheets/sync-headers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formId: form.id }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Error al sincronizar encabezados.");

      setSyncNotice("Encabezados de columnas actualizados en la hoja de cálculo.");
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : "No se pudieron actualizar los encabezados.");
    } finally {
      setSyncingHeaders(false);
    }
  }, [form.id]);

  // Sincronizar todas las respuestas a la hoja
  const syncAllResponses = useCallback(async () => {
    setSyncingAll(true);
    setSheetError(null);
    setSyncNotice(null);
    try {
      const { data } = await getSupabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("No hay sesión activa.");

      const res = await fetch("/api/sheets/sync-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formId: form.id }),
      });
      const json = (await res.json()) as { ok?: boolean; count?: number; error?: string };
      if (!res.ok || json.error) throw new Error(json.error ?? "Error al sincronizar respuestas.");

      setSyncNotice(`¡Sincronización completa! Se actualizaron ${json.count ?? 0} respuestas y columnas en tu Google Sheets.`);
    } catch (err) {
      setSheetError(err instanceof Error ? err.message : "No se pudieron sincronizar las respuestas.");
    } finally {
      setSyncingAll(false);
    }
  }, [form.id]);

  const questions = useMemo(() => form.sections.flatMap((s) => s.questions), [form]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  async function removeAll() {
    if (!window.confirm("Se eliminaran todas las respuestas. Esta accion no se puede deshacer.")) return;
    await dataSource.deleteResponses(form.id);
    setMenuOpen(false);
    onChanged();
  }

  const views: { id: View; label: string }[] = [
    { id: "summary", label: "Resumen" },
    { id: "question", label: "Pregunta" },
    { id: "individual", label: "Individual" },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
      <div className="lf-card flex flex-wrap items-center justify-between gap-3 px-6 py-4">
        <h2 className="text-2xl">
          {responses.length} {responses.length === 1 ? "respuesta" : "respuestas"}
        </h2>
        <div className="flex items-center gap-2">
          {sheetsActive ? (
            isLinked ? (
              <div className="flex items-center gap-2">
                <a
                  href={sheetUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-100"
                >
                  <Sheet size={16} />
                  Hoja vinculada
                  <ExternalLink size={14} />
                </a>
                <button
                  type="button"
                  disabled={syncingAll}
                  onClick={() => void syncAllResponses()}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-muted transition-colors hover:bg-brand-tint hover:text-brand disabled:opacity-50"
                  title="Sincronizar todas las respuestas a Google Sheets"
                >
                  <RefreshCw size={15} className={syncingAll ? "animate-spin text-brand" : ""} />
                </button>
                <button
                  type="button"
                  onClick={() => setSheetModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm text-muted transition-colors hover:bg-brand-tint hover:text-brand"
                  title="Gestionar vinculacion"
                >
                  <Unlink size={15} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setSheetModal(true)}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-brand-tint hover:text-brand"
              >
                <Sheet size={16} className="text-success" />
                Vincular con Hojas de calculo
              </button>
            )
          ) : (
            <button
              type="button"
              disabled
              title="Integracion con Google Sheets no configurada"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted opacity-60"
            >
              <Sheet size={16} className="text-success" />
              Vincular con Hojas de calculo
            </button>
          )}
          <div className="relative">
            <IconButton label="Mas opciones de respuestas" onClick={() => setMenuOpen((v) => !v)}>
              <MoreVertical size={18} />
            </IconButton>
            {menuOpen && (
              <div ref={menuRef} className="lf-card absolute right-0 z-20 mt-1 w-60 overflow-hidden py-1 text-sm">
                <button
                  type="button"
                  disabled={responses.length === 0}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-brand-tint disabled:opacity-40"
                  onClick={() => {
                    downloadText(`${form.title}.csv`, responsesToCsv(form, responses));
                    setMenuOpen(false);
                  }}
                >
                  <Download size={15} /> Descargar respuestas (CSV)
                </button>
                <button
                  type="button"
                  disabled={responses.length === 0}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-danger hover:bg-red-50 disabled:opacity-40"
                  onClick={() => void removeAll()}
                >
                  <Trash2 size={15} /> Eliminar todas las respuestas
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {syncNotice && !sheetModal && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-600 shrink-0" />
            <span>{syncNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncNotice(null)}
            className="text-green-700 hover:text-green-900 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {sheetError && !sheetModal && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-danger/30 bg-red-50 px-4 py-3 text-xs text-danger">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{sheetError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSheetError(null)}
            className="text-danger hover:text-red-900 font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {responses.length === 0 ? (
        <EmptyState
          title="Todavia no hay respuestas"
          description="Publica el formulario y comparte el enlace para empezar a recibirlas."
        />
      ) : (
        <>
          <div className="flex justify-center gap-1 border-b border-line">
            {views.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={clsx(
                  "border-b-2 px-4 py-2 text-sm transition-colors",
                  view === item.id
                    ? "border-brand font-medium text-brand"
                    : "border-transparent text-muted hover:text-ink",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* ---------------- Resumen ---------------- */}
          {view === "summary" && (
            <div className="space-y-4">
              {form.settings.isQuiz && (
                <div className="lf-card p-6">
                  <h3 className="text-base">Promedio del cuestionario</h3>
                  <p className="mt-2 text-2xl">
                    {(
                      responses.reduce((sum, r) => sum + (r.score ?? 0), 0) / responses.length
                    ).toFixed(1)}{" "}
                    <span className="text-base text-muted">
                      de {responses[0]?.totalPoints ?? 0} puntos
                    </span>
                  </p>
                </div>
              )}

              {questions.map((question) => {
                const data = tally(question, responses);
                const answered = responses.filter(
                  (r) => answerToText(question, r.answers[question.id] ?? null) !== "",
                ).length;

                return (
                  <section key={question.id} className="lf-card p-6">
                    <h3 className="text-base">{question.title}</h3>
                    <p className="mt-1 text-sm text-muted">{answered} respuestas</p>

                    {question.type === "signature" ? (
                      <p className="mt-4 text-sm text-muted">
                        {answered} firmas recogidas. Revisalas una a una en la vista Individual.
                      </p>
                    ) : data.length === 0 ? (
                      <p className="mt-4 text-sm text-muted">Sin datos para graficar.</p>
                    ) : question.type === "multiple_choice" || question.type === "dropdown" ? (
                      <div className="mt-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={data} dataKey="value" nameKey="name" outerRadius={86} label>
                              {data.map((entry, index) => (
                                <Cell key={entry.name} fill={PALETTE[index % PALETTE.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : CHOICE_TYPES.includes(question.type) ||
                      question.type === "linear_scale" ||
                      question.type === "rating" ? (
                      <div className="mt-4 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
                            <XAxis type="number" allowDecimals={false} stroke="#8A8699" fontSize={12} />
                            <YAxis
                              type="category"
                              dataKey="name"
                              width={120}
                              stroke="#8A8699"
                              fontSize={12}
                            />
                            <Tooltip cursor={{ fill: "#F6F5FE" }} />
                            <Bar dataKey="value" fill={form.theme.primaryColor} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <ul className="mt-4 space-y-2">
                        {responses
                          .map((r) => answerToText(question, r.answers[question.id] ?? null))
                          .filter(Boolean)
                          .slice(0, 12)
                          .map((text, index) => (
                            <li
                              key={index}
                              className="rounded-lg border border-line bg-brand-tint px-3 py-2 text-sm"
                            >
                              {text}
                            </li>
                          ))}
                      </ul>
                    )}
                  </section>
                );
              })}
            </div>
          )}

          {/* ---------------- Por pregunta ---------------- */}
          {view === "question" && questions.length > 0 && (
            <div className="lf-card p-6">
              <Select
                value={questionIndex}
                onChange={(e) => setQuestionIndex(Number(e.target.value))}
                className="w-full"
                aria-label="Elegir pregunta"
              >
                {questions.map((question, index) => (
                  <option key={question.id} value={index}>
                    {index + 1}. {question.title}
                  </option>
                ))}
              </Select>

              <ul className="mt-5 space-y-2">
                {responses.map((response) => {
                  const question = questions[questionIndex];
                  const value = response.answers[question.id] ?? null;
                  if (question.type === "signature" && value) {
                    return (
                      <li key={response.id}>
                        <SignaturePreview
                          form={form}
                          question={question}
                          response={response}
                          signature={value as SignatureValue}
                        />
                      </li>
                    );
                  }
                  const text = answerToText(question, value);
                  return (
                    <li
                      key={response.id}
                      className="rounded-lg border border-line px-4 py-3 text-sm"
                    >
                      {text || <span className="text-faint">Sin respuesta</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* ---------------- Individual ---------------- */}
          {view === "individual" && responses[current] && (
            <div className="lf-card p-6">
              <div className="flex items-center justify-between border-b border-line pb-4">
                <div>
                  <p className="text-sm font-medium">
                    Respuesta {current + 1} de {responses.length}
                  </p>
                  <p className="text-xs text-muted">
                    {formatDate(responses[current].submittedAt)}
                    {responses[current].respondentEmail
                      ? ` · ${responses[current].respondentEmail}`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <IconButton
                    label="Respuesta anterior"
                    disabled={current === 0}
                    onClick={() => setCurrent((i) => i - 1)}
                  >
                    <ChevronLeft size={18} />
                  </IconButton>
                  <IconButton
                    label="Respuesta siguiente"
                    disabled={current === responses.length - 1}
                    onClick={() => setCurrent((i) => i + 1)}
                  >
                    <ChevronRight size={18} />
                  </IconButton>
                </div>
              </div>

              {form.settings.isQuiz && responses[current].totalPoints !== undefined && (
                <p className="mt-4 rounded-lg border border-line bg-brand-tint px-4 py-2 text-sm">
                  Puntuacion: {responses[current].score} de {responses[current].totalPoints}
                </p>
              )}

              <dl className="mt-5 space-y-5">
                {questions.map((question) => {
                  const value = responses[current].answers[question.id] ?? null;
                  return (
                    <div key={question.id}>
                      <dt className="text-sm font-medium">{question.title}</dt>
                      <dd className="mt-1.5 text-sm text-muted">
                        {question.type === "signature" && value ? (
                          <SignaturePreview
                            form={form}
                            question={question}
                            response={responses[current]}
                            signature={value as SignatureValue}
                          />
                        ) : (
                          answerToText(question, value) || (
                            <span className="text-faint">Sin respuesta</span>
                          )
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
        </>
      )}

      {/* ---------------- Modal de Google Sheets ---------------- */}
      <Modal
        open={sheetModal}
        onClose={() => { setSheetModal(false); setSheetError(null); setSyncNotice(null); }}
        title={isLinked ? "Hoja de cálculo vinculada" : "Vincular con Google Sheets"}
      >
        {statusLoading && !googleStatus ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner label="Comprobando conexión con Google..." />
          </div>
        ) : !googleStatus?.isConfigured ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">Configuración de servidor pendiente</p>
              <p className="mt-1 text-xs text-amber-700">
                Las credenciales GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET no están definidas en las variables de entorno del servidor.
              </p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setSheetModal(false)}>Cerrar</Button>
            </div>
          </div>
        ) : !googleStatus?.isConnected ? (
          /* Estado 1: No conectado a Google Drive */
          <div className="space-y-4">
            <div className="rounded-xl border border-line bg-surface p-5 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint text-brand">
                <GoogleIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-3 text-base font-medium">Conectar tu cuenta de Google Drive</h3>
              <p className="mt-1.5 text-xs text-muted">
                Para guardar cada respuesta que se envíe en una hoja de Google Sheets, primero conecta tu cuenta de Google.
              </p>
              <div className="mt-4 rounded-lg border border-line/60 bg-brand-tint/40 p-3 text-left text-xs text-ink/80 space-y-1.5">
                <p className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-success shrink-0" />
                  Crea y organiza tus hojas de cálculo en tu propio Google Drive.
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-success shrink-0" />
                  Sincronización instantánea de respuestas en tiempo real.
                </p>
                <p className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-success shrink-0" />
                  Privado y seguro: tus datos van directo a tu cuenta.
                </p>
              </div>
            </div>

            {sheetError && (
              <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-red-50 p-3 text-xs text-danger">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{sheetError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button onClick={() => { setSheetModal(false); setSheetError(null); }}>Cancelar</Button>
              <Button variant="primary" disabled={sheetBusy} onClick={() => void connectGoogle()}>
                {sheetBusy ? (
                  <><Spinner label="" /> Conectando...</>
                ) : (
                  <><GoogleIcon className="h-4 w-4 mr-1.5" /> Conectar con Google Drive</>
                )}
              </Button>
            </div>
          </div>
        ) : isLinked ? (
          /* Estado 3: Hoja vinculada activamente */
          <div className="space-y-4">
            {googleStatus?.email && (
              <div className="flex items-center justify-between text-xs text-muted px-1">
                <span className="flex items-center gap-1.5">
                  <GoogleIcon className="h-3.5 w-3.5" />
                  Conectado como <strong className="font-medium text-ink">{googleStatus.email}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => void disconnectGoogle()}
                  className="text-muted hover:text-danger underline underline-offset-2"
                >
                  Desconectar cuenta
                </button>
              </div>
            )}

            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                <Sheet size={16} className="text-green-600" />
                Hoja vinculada activamente
              </div>
              <p className="mt-2 text-xs text-green-700 leading-relaxed">
                Cada nueva respuesta recibida se agregará automáticamente como una fila en la hoja de cálculo en tiempo real.
              </p>
              {sheetUrl && (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-green-800 underline underline-offset-2 hover:text-green-900"
                >
                  Abrir en Google Sheets <ExternalLink size={13} />
                </a>
              )}
            </div>

            {syncNotice && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                <span>{syncNotice}</span>
              </div>
            )}

            {sheetError && (
              <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-red-50 p-3 text-xs text-danger">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{sheetError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={syncingAll}
                  onClick={() => void syncAllResponses()}
                  title="Sincronizar todas las respuestas recopiladas a la hoja de Google Sheets"
                >
                  {syncingAll ? <Spinner label="" /> : <RefreshCw size={14} />}
                  Sincronizar respuestas a Sheets
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={syncingHeaders}
                  onClick={() => void syncHeaders()}
                  title="Actualizar las columnas de la hoja si agregaste o cambiaste preguntas"
                >
                  {syncingHeaders ? <Spinner label="" /> : <RefreshCw size={14} />}
                  Sincronizar encabezados
                </Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { setSheetModal(false); setSheetError(null); setSyncNotice(null); }}>
                  Cerrar
                </Button>
                <Button size="sm" variant="danger" disabled={sheetBusy} onClick={() => void unlinkSheet()}>
                  {sheetBusy ? <Spinner label="" /> : <Unlink size={14} />}
                  Desvincular
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Estado 2: Google conectado, formulario no vinculado */
          <div className="space-y-4">
            {googleStatus?.email && (
              <div className="flex items-center justify-between rounded-lg bg-brand-tint px-3 py-2 text-xs">
                <span className="flex items-center gap-1.5 text-ink">
                  <GoogleIcon className="h-3.5 w-3.5" />
                  Conectado como <strong>{googleStatus.email}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => void disconnectGoogle()}
                  className="text-xs text-muted hover:text-danger underline"
                >
                  Cambiar cuenta
                </button>
              </div>
            )}

            {/* Selector de modo */}
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-surface-raised p-1 text-xs">
              <button
                type="button"
                onClick={() => setLinkMode("new")}
                className={clsx(
                  "rounded-md py-1.5 font-medium transition-colors",
                  linkMode === "new" ? "bg-surface shadow-xs text-brand" : "text-muted hover:text-ink",
                )}
              >
                Crear nueva hoja
              </button>
              <button
                type="button"
                onClick={() => {
                  setLinkMode("existing");
                  if (existingSheets.length === 0) void loadExistingSheets();
                }}
                className={clsx(
                  "rounded-md py-1.5 font-medium transition-colors",
                  linkMode === "existing" ? "bg-surface shadow-xs text-brand" : "text-muted hover:text-ink",
                )}
              >
                Vincular existente
              </button>
            </div>

            {linkMode === "new" ? (
              <div className="rounded-lg border border-line bg-brand-tint/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-ink">
                  <Link2 size={16} className="text-brand" />
                  {form.title} (Respuestas)
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Se creará una nueva hoja de cálculo en la raíz de tu Google Drive con las preguntas como encabezados.
                  {responses.length > 0 && (
                    <strong className="block mt-1 text-brand font-medium">
                      Las {responses.length} {responses.length === 1 ? "respuesta actual se copiará" : "respuestas actuales se copiarán"} automáticamente a la hoja.
                    </strong>
                  )}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-ink">
                  Selecciona una hoja de tu Google Drive:
                </label>
                {loadingSheets ? (
                  <div className="flex items-center justify-center py-4">
                    <Spinner label="Buscando hojas de cálculo en tu Drive..." />
                  </div>
                ) : existingSheets.length > 0 ? (
                  <Select
                    value={selectedSpreadsheetId}
                    onChange={(e) => setSelectedSpreadsheetId(e.target.value)}
                    className="w-full text-xs"
                    aria-label="Seleccionar hoja de cálculo de Google Drive"
                  >
                    {existingSheets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="rounded-lg border border-line p-3 text-xs text-muted">
                    No encontramos hojas de cálculo en tu Google Drive. Puedes crear una nueva pestaña arriba.
                  </div>
                )}
              </div>
            )}

            {syncNotice && (
              <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                <CheckCircle2 size={15} className="text-green-600 shrink-0" />
                <span>{syncNotice}</span>
              </div>
            )}

            {sheetError && (
              <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-red-50 p-3 text-xs text-danger">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{sheetError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-line">
              <Button onClick={() => { setSheetModal(false); setSheetError(null); setSyncNotice(null); }}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                disabled={sheetBusy || (linkMode === "existing" && !selectedSpreadsheetId)}
                onClick={() => void linkSheet()}
              >
                {sheetBusy ? (
                  <><Spinner label="" /> {linkMode === "new" ? "Creando..." : "Vinculando..."}</>
                ) : (
                  <><Sheet size={15} /> {linkMode === "new" ? "Crear y vincular" : "Vincular hoja"}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
