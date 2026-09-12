/**
 * Cliente server-only de Google Sheets y Drive con soporte OAuth 2.0.
 *
 * Usa GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET para autenticacion de usuario.
 */
import { google } from "googleapis";

export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function getOAuth2Client(redirectUri?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en las variables de entorno.");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getClientForUser(refreshToken: string) {
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

export function getSheetsClientForUser(refreshToken: string) {
  const auth = getClientForUser(refreshToken);
  return google.sheets({ version: "v4", auth });
}

export function getDriveClientForUser(refreshToken: string) {
  const auth = getClientForUser(refreshToken);
  return google.drive({ version: "v3", auth });
}

/** Devuelve true si las credenciales de Google OAuth o Service Account estan configuradas. */
export function isGoogleConfigured(): boolean {
  return Boolean(
    (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
  );
}
