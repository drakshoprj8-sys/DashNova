const INTERNAL_ORIGIN = "https://internal.invalid";

/**
 * Confere um segmento completo da URL, sem liberar prefixos parecidos.
 * Ex.: `/api/public/evento` pertence a `/api/public`, mas `/api/publicity`
 * não pertence.
 */
export function isPathAtOrBelow(pathname: string, basePath: string): boolean {
  const normalizedBase = basePath === "/" ? "/" : basePath.replace(/\/+$/, "");

  if (normalizedBase === "/") return pathname === "/";
  return (
    pathname === normalizedBase || pathname.startsWith(`${normalizedBase}/`)
  );
}

/**
 * Aceita apenas destinos internos absolutos. A validação por `URL` também
 * bloqueia variantes com barras invertidas que navegadores normalizam como
 * URLs externas (por exemplo, `/\\evil.example`).
 */
export function safeInternalPath(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;

  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
