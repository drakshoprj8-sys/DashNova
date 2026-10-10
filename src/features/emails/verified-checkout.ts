/** Recria no domínio da aplicação o checkout publicado associado ao pedido. */
export function verifiedCheckoutUrl(
  storedUrl: string | null,
  slug: string | null,
  kind: "checkout" | "payment-link",
  appUrl: string,
): string | null {
  if (!storedUrl || !slug || !/^[a-z0-9][a-z0-9_-]{0,127}$/i.test(slug)) return null;
  try {
    const stored = new URL(storedUrl);
    const base = new URL(appUrl);
    if (stored.protocol !== "https:" && !(stored.protocol === "http:" && stored.hostname === "localhost")) return null;
    if (base.protocol !== "https:" && !(base.protocol === "http:" && base.hostname === "localhost")) return null;
    const path = kind === "checkout" ? `/checkout/${slug}` : `/pagar/${slug}`;
    if (stored.pathname !== path || stored.search || stored.hash || stored.username || stored.password) return null;
    return new URL(path, base).toString();
  } catch {
    return null;
  }
}
