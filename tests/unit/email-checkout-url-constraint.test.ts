import { describe, expect, it } from "vitest";
import { checkoutPath, matchesOrderCheckout } from "@/features/emails/checkout-url-constraint";

describe("link digitado do checkout", () => {
  it("aceita o link informado somente para o mesmo checkout do pedido", () => {
    const requested = "https://www.suaempresacto.site/pagar/v4nfdiydvd";
    expect(checkoutPath(requested)).toBe("/pagar/v4nfdiydvd");
    expect(matchesOrderCheckout(requested, "https://www.suaempresact.site/pagar/v4nfdiydvd")).toBe(true);
    expect(matchesOrderCheckout(requested, "https://www.suaempresact.site/pagar/outro")).toBe(false);
    expect(matchesOrderCheckout(requested, "https://www.suaempresact.site/checkout/v4nfdiydvd")).toBe(false);
  });

  it("rejeita URLs com parâmetros, credenciais, HTTP ou caminhos fora do checkout", () => {
    expect(checkoutPath("https://www.suaempresacto.site/pagar/v4nfdiydvd?next=outro")).toBeNull();
    expect(checkoutPath("https://utilizador@www.suaempresacto.site/pagar/v4nfdiydvd")).toBeNull();
    expect(checkoutPath("http://www.suaempresacto.site/pagar/v4nfdiydvd")).toBeNull();
    expect(checkoutPath("https://www.suaempresacto.site/qualquer/outro")).toBeNull();
  });
});
