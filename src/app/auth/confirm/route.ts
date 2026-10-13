import { NextResponse, type NextRequest } from "next/server";

import { safeInternalPath } from "@/lib/path-security";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function noStoreRedirect(url: URL): NextResponse {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function recoveryErrorRedirect(
  request: NextRequest,
  error: "configuracao" | "link-invalido",
): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/redefinir-senha";
  url.search = "";
  url.searchParams.set("error", error);
  return noStoreRedirect(url);
}

/**
 * Finaliza o fluxo PKCE iniciado por `resetPasswordForEmail`: troca o código
 * de uso único por uma sessão em cookies antes de abrir o formulário.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!isSupabaseConfigured()) {
    return recoveryErrorRedirect(request, "configuracao");
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    return recoveryErrorRedirect(request, "link-invalido");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return recoveryErrorRedirect(request, "link-invalido");
  }

  const nextPath = safeInternalPath(
    request.nextUrl.searchParams.get("next"),
    "/redefinir-senha",
  );
  return noStoreRedirect(new URL(nextPath, request.url));
}
