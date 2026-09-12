/**
 * SHA-256 sobre el contenido firmado. Queda guardado junto a la firma para
 * poder demostrar que el documento no cambio despues de firmarse.
 */
export async function sha256(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Respaldo determinista para entornos sin WebCrypto (solo pruebas).
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, "0").repeat(8);
}
