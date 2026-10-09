/** O URL digitado seleciona um checkout; o e-mail usa o URL validado do pedido. */
export function checkoutPath(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    return /^\/(?:checkout|pagar)\/[a-z0-9][a-z0-9_-]{0,127}$/i.test(url.pathname)
      ? url.pathname
      : null;
  } catch {
    return null;
  }
}

export function matchesOrderCheckout(requestedUrl: string, verifiedUrl: string): boolean {
  const requested = checkoutPath(requestedUrl);
  return requested !== null && requested === checkoutPath(verifiedUrl);
}
