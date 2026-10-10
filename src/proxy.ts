import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { isPanelHost, isStorePath, normalizeHost } from "@/lib/hosts";
import { isOwnerEmail } from "@/lib/auth/owner";
import { isPathAtOrBelow } from "@/lib/path-security";
import { isDemoModeAllowed } from "@/lib/supabase/config";

const PUBLIC_PATHS = [
  "/login",
  "/cadastro",
  "/recuperar-senha",
  "/redefinir-senha",
  "/auth",
  "/p",
  "/lp",
  // Página pública de um link de pagamento — quem vai pagar não tem sessão.
  "/pagar",
  "/checkout",
  "/obrigado",
  "/acompanhar",
  "/legal",
  "/api/public",
  // Rotas de cron não têm sessão do painel. Cada uma valida CRON_SECRET.
  "/api/cron",
  // Webhooks NUNCA podem exigir sessão: são chamados por servidores
  // externos (Broski, Resend...). A autenticidade é garantida pela
  // verificação de assinatura HMAC dentro de cada rota.
  "/api/webhooks",
];

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return false; // raiz redireciona para o painel
  return PUBLIC_PATHS.some((path) => isPathAtOrBelow(pathname, path));
}

/**
 * Proxy (Next 16, antigo middleware): separa os domínios das lojas do
 * domínio do painel, renova a sessão Supabase e protege as rotas
 * administrativas. Sem Supabase configurado, as rotas protegidas falham
 * fechadas; o painel só abre sem sessão com ALLOW_DEMO_MODE=true.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = normalizeHost(request.headers.get("host"));

  // Domínio próprio de uma loja: só rotas públicas, e sem tocar na sessão
  // (poupa uma chamada ao Supabase em cada visita de cliente).
  if (!isPanelHost(host)) {
    if (!isStorePath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Rotas públicas continuam acessíveis para explicar a configuração ou
  // receber callbacks. Rotas protegidas só abrem sem Supabase quando o modo
  // demonstração foi habilitado explicitamente.
  if (!supabaseUrl || !supabaseKey) {
    if (isPublicPath(pathname) || isDemoModeAllowed()) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Importante: não executar lógica entre createServerClient e getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ownerAuthorized = Boolean(user && isOwnerEmail(user.email));

  if (!ownerAuthorized && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (ownerAuthorized && (pathname === "/login" || pathname === "/cadastro")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Tudo exceto assets estáticos e imagens.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
