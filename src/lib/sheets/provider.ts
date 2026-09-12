import { getSupabase } from "../supabase/client";
import type { FormDoc, ResponseDoc } from "../types";

/**
 * Punto de extension para la integracion con Google Sheets.
 *
 * Cuando SHEETS_SYNC_ENABLED esta activo, el provider llama a los route
 * handlers server-side (/api/sheets/*) que usan la Service Account de Google
 * para leer y escribir hojas de calculo. Las credenciales nunca llegan al
 * navegador.
 */
export interface SheetsSyncProvider {
  readonly enabled: boolean;
  /** Crea la hoja asociada al formulario y devuelve su id de Drive. */
  ensureSpreadsheet(form: FormDoc): Promise<string | null>;
  /** Anade una fila con la respuesta recien enviada. */
  appendResponse(form: FormDoc, response: ResponseDoc): Promise<void>;
  /** Reescribe la fila de encabezados cuando cambian las preguntas. */
  syncHeaders(form: FormDoc): Promise<void>;
}

/* ------------------------------------------------------------------ */
/* Provider inactivo (sin Google)                                      */
/* ------------------------------------------------------------------ */

const noopProvider: SheetsSyncProvider = {
  enabled: false,
  async ensureSpreadsheet() {
    return null;
  },
  async appendResponse() {
    /* sin efecto hasta conectar la API de Google */
  },
  async syncHeaders() {
    /* sin efecto hasta conectar la API de Google */
  },
};

/* ------------------------------------------------------------------ */
/* Provider activo: llama a los route handlers server-side             */
/* ------------------------------------------------------------------ */

/** Obtiene el token JWT de Supabase para enviar en el header Authorization. */
async function getAccessToken(): Promise<string | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session?.access_token ?? null;
}

const sheetsProvider: SheetsSyncProvider = {
  enabled: true,

  async ensureSpreadsheet(form) {
    const token = await getAccessToken();
    if (!token) return null;

    try {
      const res = await fetch("/api/sheets/link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formId: form.id, action: "create" }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { spreadsheetId?: string };
      return data.spreadsheetId ?? null;
    } catch {
      return null;
    }
  },

  async appendResponse(form, response) {
    try {
      const questions = form.sections.flatMap((s) => s.questions);
      await fetch("/api/sheets/append", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          formId: form.id,
          answers: response.answers,
          submittedAt: response.submittedAt,
          respondentEmail: response.respondentEmail,
          questions,
        }),
      });
    } catch {
      // Silencioso: no bloquear el envio de la respuesta
    }
  },

  async syncHeaders(form) {
    const token = await getAccessToken();
    if (!token) return;

    try {
      await fetch("/api/sheets/sync-headers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formId: form.id }),
      });
    } catch {
      // Silencioso
    }
  },
};

/* ------------------------------------------------------------------ */
/* Selector                                                            */
/* ------------------------------------------------------------------ */

const isEnabled =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_SHEETS_SYNC_ENABLED === "true"
    : process.env.SHEETS_SYNC_ENABLED === "true";

export function getSheetsProvider(): SheetsSyncProvider {
  return isEnabled ? sheetsProvider : noopProvider;
}

/** Indica si la integracion con Google Sheets esta habilitada. */
export function isSheetsEnabled(): boolean {
  return isEnabled;
}
