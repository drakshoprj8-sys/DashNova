import * as React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CheckoutFooter } from "@/features/checkout/checkout-footer";

describe("CheckoutFooter", () => {
  it("reproduz a estrutura completa com a identidade da loja", () => {
    render(
      <CheckoutFooter
        backgroundColor="#e30613"
        checkoutSlug="checkout-exemplo"
        productSlug="produto-exemplo"
        storeName="Minha Loja"
        supportEmail="apoio@minhaloja.pt"
      />,
    );

    expect(screen.getByText("Minha Loja")).toBeTruthy();
    expect(screen.getByText("Loja")).toBeTruthy();
    expect(screen.getByText("Apoio ao Cliente")).toBeTruthy();
    expect(screen.getByText("Informações Legais")).toBeTruthy();
    expect(screen.getByAltText("MB WAY")).toBeTruthy();
    expect(screen.getByAltText("Multibanco")).toBeTruthy();
    expect(screen.getByText(/Reveja os dados da encomenda/)).toBeTruthy();
    expect(screen.queryByText("14 dias para devolver")).toBeNull();
  });

  it("usa somente métodos aceites e mantém links públicos reais", () => {
    render(
      <CheckoutFooter
        backgroundColor="#e30613"
        checkoutSlug="checkout-exemplo"
        productSlug="produto-exemplo"
        storeName="Minha Loja"
        supportEmail="apoio@minhaloja.pt"
      />,
    );

    expect(screen.queryByText("Visa")).toBeNull();
    expect(screen.queryByText("Mastercard")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Contactos" }).getAttribute("href"),
    ).toBe("mailto:apoio@minhaloja.pt");
    expect(
      screen
        .getByRole("link", { name: "Página do produto" })
        .getAttribute("href"),
    ).toBe("/p/produto-exemplo");
    expect(
      screen.getByRole("link", { name: "Checkout" }).getAttribute("href"),
    ).toBe("/checkout/checkout-exemplo");
    expect(
      screen
        .getByRole("link", { name: "Envios e Entregas" })
        .getAttribute("href"),
    ).toBe("/legal/envios");
  });
});
