import { mockSource } from "./mock";
import { supabaseSource } from "./supabase";
import type { DataSource } from "./types";

/**
 * Selector de fuente de datos. Cambia NEXT_PUBLIC_DATA_SOURCE en .env.local
 * para pasar del modo mock a Supabase sin tocar una sola linea de la interfaz.
 */
export const dataSource: DataSource =
  process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" ? supabaseSource : mockSource;

export const isMock = dataSource.name === "mock";
export { DataError } from "./types";
export type { DataSource } from "./types";
