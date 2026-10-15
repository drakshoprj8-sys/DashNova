import { describe, expect, it } from "vitest";
import { getOrderNotificationValidationError, isCanonicalOrderNotification } from "@/features/emails/notification-policy";
import { DEFAULT_CAMPAIGN_TEMPLATE } from "@/features/emails/template";
import {
  buildNotificationContent,
  DEFAULT_NOTIFICATION_PREFERENCES,
  ORDER_UPDATE_PREFERENCES,
  RECOVERY_PREFERENCES,
  SUPPORTED_NOTIFICATION_BODIES,
  NOTIFICATION_OPTIONS,
} from "@/features/emails/notification-content";

describe("fixed order notifications", () => {
  it("accepts the published model with unrelated dispatch fields", () => {
    expect(
      isCanonicalOrderNotification({
        ...DEFAULT_CAMPAIGN_TEMPLATE,
        mode: "send",
        segment: "paid",
      }),
    ).toBe(true);
  });

  it.each([
    ["headerName", "Correios de Portugal"],
    ["body", "A sua encomenda está retida. Pague para a libertar."],
    ["ctaUrl", "https://example.com/pagar"],
    ["subject", "Cobrança urgente"],
    ["articleName", "Artigo inventado"],
  ])("rejects changing %s even with a valid dispatch", (field, value) => {
    expect(
      isCanonicalOrderNotification({
        ...DEFAULT_CAMPAIGN_TEMPLATE,
        [field]: value,
        mode: "send",
      }),
    ).toBe(false);
  });

  it("rejects legacy or missing models", () => {
    expect(isCanonicalOrderNotification({})).toBe(false);
  });

  it("still rejects edited content with transport line endings", () => {
    expect(
      isCanonicalOrderNotification({
        ...DEFAULT_CAMPAIGN_TEMPLATE,
        body:
          DEFAULT_CAMPAIGN_TEMPLATE.body.replace(/\n/g, "\r\n") +
          " Pague aqui.",
      }),
    ).toBe(false);
  });

  it("accepts a personal note while retaining the verified order message", () => {
    const content = buildNotificationContent({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      customMessage: "O apoio da loja pode esclarecer dúvidas sobre o pedido.",
    });
    expect(isCanonicalOrderNotification(content)).toBe(true);
    expect(content.body).toContain("Somos a equipa da PCCGVIP");
  });

  it("allows a custom header that identifies the verified store", () => {
    expect(isCanonicalOrderNotification({
      ...DEFAULT_CAMPAIGN_TEMPLATE,
      headerName: "Equipa de apoio PCCGVIP",
    })).toBe(true);
    expect(isCanonicalOrderNotification({
      ...DEFAULT_CAMPAIGN_TEMPLATE,
      headerName: "Entrega <Correios>",
    })).toBe(false);
  });

  it("allows concise custom fields about a verified order", () => {
    expect(isCanonicalOrderNotification({
      ...DEFAULT_CAMPAIGN_TEMPLATE,
      subject: "PCCGVIP — novidades do seu pedido {{PEDIDO}}",
      preheader: "Consulte as informações disponíveis no nosso apoio.",
      title: "Detalhes da encomenda",
    })).toBe(true);
  });

  it("permite personalizar o texto do botão para consultar o pedido", () => {
    const content = buildNotificationContent({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ctaLabel: "Acompanhar encomenda",
    });
    expect(content.ctaLabel).toBe("Acompanhar encomenda");
    expect(isCanonicalOrderNotification(content)).toBe(true);
    expect(getOrderNotificationValidationError({ ...content, subject: "Outro assunto" })).toBeNull();
    expect(getOrderNotificationValidationError({ ...content, subject: "Assunto\nBcc: outra pessoa" })).toContain("Assunto:");
    expect(isCanonicalOrderNotification({ ...content, ctaLabel: "Abrir checkout do pedido" })).toBe(true);
    expect(isCanonicalOrderNotification({ ...content, ctaUrl: "https://www.suaempresacto.site/pagar/v4nfdiydvd" }, true)).toBe(true);
    expect(isCanonicalOrderNotification({ ...content, ctaUrl: "https://www.suaempresacto.site/pagar/v4nfdiydvd" })).toBe(false);
    expect(isCanonicalOrderNotification({ ...content, ctaUrl: "https://www.suaempresacto.site/pagar/v4nfdiydvd?next=outro" }, true)).toBe(false);
  });

  it.each([
    "Consulte https://example.com/pagar",
    "Pague uma taxa para libertar a encomenda.",
    "A encomenda encontra-se retida no centro de distribuição.",
  ])("rejects a note that directs payment or asserts a hold: %s", (customMessage) => {
    const content = buildNotificationContent({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      customMessage,
    });
    expect(isCanonicalOrderNotification(content)).toBe(false);
  });

  it("aceita a confirmação de pedido com botão de acompanhamento", () => {
    const content = buildNotificationContent({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      introduction: 3,
      ctaLabel: "Acompanhar o meu pedido",
    });
    expect(content.body).toContain("está confirmado");
    expect(content.body).toContain("Somos a equipa da PCCGVIP.");
    expect(content.body).not.toMatch(/pagar|pagamento|retid[ao]|taxa/i);
    expect(isCanonicalOrderNotification(content)).toBe(true);
    // O botão de acompanhamento continua apontando para o link do pedido real.
    expect(content.ctaUrl).toBe("{{CHECKOUT_URL}}");
  });

  it("recusa transformar a confirmação num pedido de pagamento", () => {
    const content = buildNotificationContent({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      introduction: 3,
    });
    expect(
      isCanonicalOrderNotification({ ...content, ctaLabel: "Pagar agora" }),
    ).toBe(false);
    expect(
      isCanonicalOrderNotification({
        ...content,
        title: "A sua encomenda está retida",
      }),
    ).toBe(false);
  });

  it("o preset de atualização de pedido é uma notificação canônica", () => {
    const content = buildNotificationContent(ORDER_UPDATE_PREFERENCES);
    expect(content.ctaLabel).toBe("Acompanhar o meu pedido");
    expect(content.body).toContain("estado atual do seu pedido");
    expect(content.body).not.toMatch(/pagar|pagamento|retid[ao]|taxa/i);
    expect(isCanonicalOrderNotification(content)).toBe(true);
  });

  it("o preset de recuperação de compra é uma notificação canônica", () => {
    const content = buildNotificationContent(RECOVERY_PREFERENCES);
    expect(content.ctaLabel).toBe("Retomar a minha compra");
    expect(content.body).toContain("ainda não a concluiu");
    expect(content.body).toContain("Somos a equipa da PCCGVIP.");
    // Recuperação honesta: sem retenção, cobrança ou pedido de pagamento.
    expect(content.body).not.toMatch(
      /pagar|pagamento|retid[ao]|taxa|libertar|bloquead[ao]/i,
    );
    expect(isCanonicalOrderNotification(content)).toBe(true);
    // O botão aponta para o checkout real do pedido pendente de cada cliente.
    expect(
      isCanonicalOrderNotification(
        { ...content, ctaUrl: "https://www.suaempresacto.site/pagar/v4nfdiydvd" },
        true,
      ),
    ).toBe(true);
    // Fora de um pedido pendente verificado, o link externo é recusado.
    expect(
      isCanonicalOrderNotification({
        ...content,
        ctaUrl: "https://www.suaempresacto.site/pagar/v4nfdiydvd",
      }),
    ).toBe(false);
    // O rótulo não pode virar um pedido de pagamento.
    expect(
      isCanonicalOrderNotification({ ...content, ctaLabel: "Pagar agora" }),
    ).toBe(false);
  });

  it("keeps the original template as the default", () => {
    expect(buildNotificationContent(DEFAULT_NOTIFICATION_PREFERENCES)).toEqual(
      DEFAULT_CAMPAIGN_TEMPLATE,
    );
  });

  it("accepts supported personalization with multipart line endings", () => {
    const content = buildNotificationContent({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      subject: NOTIFICATION_OPTIONS.subject[1],
      headerName: NOTIFICATION_OPTIONS.headerName[1],
      greeting: 1,
      introduction: 2,
      support: 1,
      closing: 1,
      showValue: false,
    });
    expect(
      isCanonicalOrderNotification({
        ...content,
        body: content.body.replace(/\n/g, "\r\n"),
      }),
    ).toBe(true);
    expect(content.body).not.toContain("{{VALOR}}");
  });

  it("keeps all composed messages identified as the store and without links", () => {
    expect(SUPPORTED_NOTIFICATION_BODIES.size).toBe(324);
    for (const body of SUPPORTED_NOTIFICATION_BODIES) {
      expect(body).toContain("Somos a equipa da PCCGVIP.");
      expect(body).toContain(
        "Se não reconhece a PCCGVIP ou este pedido, desconsidere esta mensagem.",
      );
      expect(body).not.toMatch(/https?:|<|\{\{(?:CHECKOUT_URL|LOJA_URL)\}\}/i);
    }
  });

  it.each([
    ["subject", "Correios: encomenda retida"],
    ["preheader", "Pague para libertar a sua encomenda"],
    ["title", "Pagamento obrigatório"],
    ["ctaLabel", "Pagar agora"],
    ["fallbackText", "https://example.com/pagar"],
  ])(
    "rejects unsupported %s even when the rest is a supported variant",
    (field, value) => {
      const content = buildNotificationContent({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        closing: 1,
      });
      expect(isCanonicalOrderNotification({ ...content, [field]: value })).toBe(
        false,
      );
    },
  );
});
