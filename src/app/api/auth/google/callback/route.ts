import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "googleapis";
import { getOAuth2Client } from "@/lib/sheets/google";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "";
  const error = searchParams.get("error");

  const origin = request.nextUrl.origin;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

  let returnTo = "/";
  let userId = "";

  if (state) {
    try {
      const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf8")) as {
        userId?: string;
        returnTo?: string;
      };
      if (decoded.returnTo) returnTo = decoded.returnTo;
      if (decoded.userId) userId = decoded.userId;
    } catch {
      // Ignorar error de parsing de state
    }
  }

  // Si el usuario canceló o hubo error de Google
  if (error || !code) {
    const redirectUrl = new URL(returnTo, origin);
    redirectUrl.searchParams.set("google_error", error || "no_code");
    return NextResponse.redirect(redirectUrl);
  }

  if (!userId) {
    const redirectUrl = new URL(returnTo, origin);
    redirectUrl.searchParams.set("google_error", "missing_user");
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const oauth2 = getOAuth2Client(redirectUri);
    const { tokens } = await oauth2.getToken(code);

    if (!tokens.refresh_token) {
      // Nota: Si el usuario ya habia consentido antes, Google puede no mandar refresh_token
      // a menos que prompt="consent". Nuestro endpoint siempre pide prompt="consent".
      // Si por alguna razon no llega, notificamos.
    }

    let googleEmail: string | null = null;
    try {
      oauth2.setCredentials(tokens);
      const oauth2Api = google.oauth2({ version: "v2", auth: oauth2 });
      const userInfo = await oauth2Api.userinfo.get();
      googleEmail = userInfo.data.email ?? null;
    } catch {
      // Opcional
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );

    // Reintentar hasta 3 veces en caso de timeout o cold start de Supabase (HTTP 504)
    let rpcErr: { message?: string } | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await supabase.rpc("save_user_google_token", {
        p_user_id: userId,
        p_email: googleEmail,
        p_refresh_token: tokens.refresh_token || "",
        p_access_token: tokens.access_token || null,
        p_expiry_date: tokens.expiry_date || null,
      });
      rpcErr = res.error;
      if (!rpcErr) break;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
      }
    }

    if (rpcErr) {
      console.error("Error guardando token de Google:", rpcErr);
      const redirectUrl = new URL(returnTo, origin);
      const errDetail = rpcErr.message || "save_token_failed";
      redirectUrl.searchParams.set("google_error", encodeURIComponent(errDetail));
      return NextResponse.redirect(redirectUrl);
    }

    const redirectUrl = new URL(returnTo, origin);
    redirectUrl.searchParams.set("google", "connected");
    return NextResponse.redirect(redirectUrl);
  } catch (err: unknown) {
    console.error("Error en intercambio de OAuth callback:", err);
    const redirectUrl = new URL(returnTo, origin);
    const msg = err instanceof Error ? err.message : "oauth_failed";
    redirectUrl.searchParams.set("google_error", encodeURIComponent(msg));
    return NextResponse.redirect(redirectUrl);
  }
}
