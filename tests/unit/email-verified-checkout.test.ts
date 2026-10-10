import { describe, expect, it } from "vitest";
import { verifiedCheckoutUrl } from "@/features/emails/verified-checkout";

describe("checkout associado a pedido pendente", () => {
  const appUrl = "https://www.suaempresact.site";

  it("reconstrói um checkout publicado no domínio da aplicação", () => {
    expect(verifiedCheckoutUrl(
      "https://www.suaempresacto.site/pagar/exemplo123",
      "exemplo123",
      "payment-link",
      appUrl,
    )).toBe("https://www.suaempresact.site/pagar/exemplo123");
    expect(verifiedCheckoutUrl(
      "https://loja.exemplo.pt/checkout/produto-a",
      "produto-a",
      "checkout",
      appUrl,
    )).toBe("https://www.suaempresact.site/checkout/produto-a");
  });

  it("rejeita links que não correspondem ao checkout ligado ao pedido", () => {
    expect(verifiedCheckoutUrl("https://loja.exemplo.pt/pagar/outro", "exemplo123", "payment-link", appUrl)).toBeNull();
    expect(verifiedCheckoutUrl("https://loja.exemplo.pt/pagar/exemplo123?redirect=externo", "exemplo123", "payment-link", appUrl)).toBeNull();
    expect(verifiedCheckoutUrl("http://loja.exemplo.pt/pagar/exemplo123", "exemplo123", "payment-link", appUrl)).toBeNull();
    expect(verifiedCheckoutUrl("https://loja.exemplo.pt/pagar/exemplo123", null, "payment-link", appUrl)).toBeNull();
  });
});
