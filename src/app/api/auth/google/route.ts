import { NextRequest, NextResponse } from "next/server";
import { getOAuth2Client, GOOGLE_OAUTH_SCOPES } from "@/lib/sheets/google";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state") || "";
  const origin = request.nextUrl.origin;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/google/callback`;

  try {
    const oauth2 = getOAuth2Client(redirectUri);
    const authUrl = oauth2.generateAuthUrl({
      access_type: "offline",
      prompt: "consent select_account",
      scope: GOOGLE_OAUTH_SCOPES,
      state,
    });

    return NextResponse.redirect(authUrl);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error iniciando OAuth";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
