import { describe, expect, it } from "vitest";
import { STORE_NOTICE_PREFERENCES } from "@/features/emails/store-notice";
import {
  TRACKING_BUTTON_LABEL,
  TRACKING_PREVIEW_URL,
  buildStoreNoticeTrackingContent,
  buildStoreNoticeTrackingHtml,
  getStoreNoticeTrackingValidationError,
} from "@/features/emails/store-notice-tracking";

const content = buildStoreNoticeTrackingContent({
  ...STORE_NOTICE_PREFERENCES,
  ctaLabel: TRACKING_BUTTON_LABEL,
});
const vars = {
  nome: "Ana",
  primeiroNome: "Ana",
  email: "ana@example.com",
  pedido: "PED-1",
  produto: "Livro",
  valor: "10 €",
  lojaUrl: "https://loja.example",
  checkoutUrl: "https://loja.example/acompanhar/payload.assinatura",
};

describe("acompanhamento individual do pedido", () => {
  it.each(["Acompanhar pedido", "Ver o meu pedido", "Acompanhar encomenda"])(
    "permite o texto %s com endereço automático",
    (ctaLabel) => {
      expect(
        getStoreNoticeTrackingValidationError({ ...content, ctaLabel }),
      ).toBeNull();
    },
  );
  it.each([
    "Continuar para o pagamento",
    "Pague a taxa do pedido",
    "Pedido Worten",
    "Pedido CTT",
    "<b>Ver pedido</b>",
  ])("rejeita texto de cobrança, terceiros ou HTML: %s", (ctaLabel) => {
    expect(
      getStoreNoticeTrackingValidationError({ ...content, ctaLabel }),
    ).not.toBeNull();
  });
  it.each([
    { ctaUrl: "https://loja.example/pagar/taxa" },
    { ctaUrl: "https://loja.example/acompanhar/payload.assinatura" },
    { checkoutMode: "checkout" },
    { offerUrl: "https://loja.example/checkout/produto" },
    { fallbackText: "https://outro.example" },
  ])("recusa endereço manual ou mistura de finalidades: %j", (changes) => {
    expect(
      getStoreNoticeTrackingValidationError({ ...content, ...changes }),
    ).not.toBeNull();
  });
  it("renderiza somente o endereço de acompanhamento individual recebido do servidor", () => {
    const html = buildStoreNoticeTrackingHtml({ ...content, vars });
    expect(html).toContain(`href="${vars.checkoutUrl}"`);
    expect(html).toContain(TRACKING_BUTTON_LABEL);
    expect(html).not.toContain("/pagar/");
    expect(html).not.toContain("/checkout/");
  });
  it.each([
    "https://outro.example/acompanhar/payload.assinatura",
    "https://loja.example/pagar/taxa",
    "https://loja.example/checkout/produto",
    "https://loja.example/acompanhar/payload.assinatura?redirect=/pagar/taxa",
    "https://loja.example/acompanhar/payload.assinatura#taxa",
    "",
  ])("oculta o botão para destino não aprovado: %s", (checkoutUrl) => {
    expect(
      buildStoreNoticeTrackingHtml({
        ...content,
        vars: { ...vars, checkoutUrl },
      }),
    ).not.toContain("href=");
  });
  it("usa um endereço demonstrativo sem pedido real na prévia", () => {
    expect(
      buildStoreNoticeTrackingHtml({
        ...content,
        vars: { ...vars, checkoutUrl: TRACKING_PREVIEW_URL },
      }),
    ).toContain(TRACKING_PREVIEW_URL);
  });
});
