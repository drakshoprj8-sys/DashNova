import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CAMPAIGN_TEMPLATE } from "@/features/emails/template";
import {
  STORE_NOTICE_KIND,
  STORE_NOTICE_PREFERENCES,
  buildStoreNoticeContent,
} from "@/features/emails/store-notice";
import { buildStoreOfferContent } from "@/features/emails/store-offer";
import {
  NOTICE_LINK_DEFAULTS,
  buildStoreNoticeLinkContent,
} from "@/features/emails/store-notice-link";
import {
  STORE_NOTICE_OFFER_KIND,
  buildStoreNoticeOfferContent,
} from "@/features/emails/store-notice-offer";
import {
  buildNotificationContent,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_OPTIONS,
} from "@/features/emails/notification-content";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getSegmentRecipients: vi.fn(),
  getCustomRecipients: vi.fn(),
  sendEmail: vi.fn(),
  sendEmailBatch: vi.fn(),
  validateStoreOffer: vi.fn(),
}));
vi.mock("@/features/emails/store-offer-actions", () => ({
  validateStoreOfferAction: mocks.validateStoreOffer,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/features/emails/campaign-eligibility", () => ({
  eligibleCampaignRecipients: async (
    _workspace: string,
    recipients: unknown[],
  ) => recipients,
  inspectCampaignEligibility: async (
    _workspace: string,
    recipients: unknown[],
  ) => ({
    recipients,
    excludedRecent: 0,
    excludedConsent: 0,
    excludedMailDomain: 0,
  }),
  describeCampaignExclusions: () => "",
  reserveCampaignRecipients: async (
    _workspace: string,
    recipients: unknown[],
  ) => recipients,
}));
vi.mock("@/features/emails/unsubscribe-token", () => ({
  createUnsubscribeUrl: () =>
    "https://example.com/api/public/emails/unsubscribe?token=test",
}));
vi.mock("@/database/client", () => ({
  getDb: mocks.getDb,
  isDatabaseConfigured: () => true,
}));
vi.mock("@/features/emails/campaigns", () => ({
  refreshCampaignStats: vi.fn(),
}));
vi.mock("@/features/emails/segments", () => ({
  getSegmentRecipients: mocks.getSegmentRecipients,
  getCustomRecipients: mocks.getCustomRecipients,
}));
vi.mock("@/features/emails/resend-provider", () => ({
  isResendConfigured: () => true,
  MAX_EMAILS_PER_BATCH: 100,
  sendEmail: mocks.sendEmail,
  sendEmailBatch: mocks.sendEmailBatch,
  testResendConnection: vi.fn(),
}));
vi.mock("@/lib/company", () => ({ company: { email: "" } }));
vi.mock("@/lib/app-url", () => ({ getAppUrl: () => "https://example.com" }));
vi.mock("@/lib/auth/session", () => ({
  getSession: async () => ({ demoMode: false }),
}));
vi.mock("@/lib/workspace", () => ({
  getOrCreateDefaultWorkspace: async () => "workspace",
}));

import { sendCampaignAction } from "@/features/emails/actions";

function form(changes: Record<string, string> = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({
    ...DEFAULT_CAMPAIGN_TEMPLATE,
    dispatchId: "00000000-0000-4000-8000-000000000001",
    segment: "refused",
    mode: "send",
    ...changes,
  }))
    data.set(key, value);
  return data;
}

describe("notification server boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_FROM_EMAIL", "notificacoes@encomendapgcvip.site");
  });

  const offer = {
    storeName: "Minha marca",
    productName: "Produto novo",
    priceCents: 3999,
    currency: "EUR",
    checkoutUrl: "https://example.com/checkout/produto",
  };
  it("envia um comunicado personalizado para clientes importados selecionados sem exigir pedido novo", async () => {
    const values = vi.fn().mockReturnValue({
      onConflictDoNothing: () => ({
        returning: async () => [{ id: "campaign" }],
      }),
      onConflictDoUpdate: async () => undefined,
    });
    const db = {
      insert: vi.fn().mockReturnValue({ values }),
      update: vi
        .fn()
        .mockReturnValue({ set: () => ({ where: async () => undefined }) }),
      selectDistinct: vi.fn(),
    };
    mocks.getDb.mockReturnValue(db);
    mocks.getCustomRecipients.mockResolvedValue({
      recipients: [
        {
          id: "a",
          name: "Ana",
          email: "ana@example.com",
          productName: "Cadeira",
          orderId: null,
        },
      ],
      totalSelected: 1,
    });
    mocks.sendEmailBatch.mockResolvedValue({ ok: true, externalIds: ["a"] });
    const content = buildStoreNoticeContent({
      ...STORE_NOTICE_PREFERENCES,
      subject: "Ana, confira as novidades",
      headerName: "Equipa da minha loja",
    });
    const result = await sendCampaignAction(
      null,
      form({
        ...content,
        segment: "custom",
        checkoutMode: "notice",
        customerIds: "a",
        campaignName: "Clientes da outra loja",
      }),
    );
    expect(result).toMatchObject({ ok: true, total: 1 });
    expect(values.mock.calls[0][0].name).toBe("Clientes da outra loja");
    expect(mocks.getCustomRecipients).toHaveBeenCalledWith(["a"], undefined);
    expect(db.selectDistinct).not.toHaveBeenCalled();
    expect(mocks.sendEmailBatch.mock.calls[0][0][0].subject).toBe(
      "Ana, confira as novidades",
    );
  });
  it.each(["all", "paid", "imported_paid", "imported_pending", "no_orders"])(
    "recusa links arbitrários antes do teste e do lote no público %s",
    async (segment) => {
      for (const url of [
        "https://externo.example/redirecionar?origem=email#novidades",
        "https://www.encomendasualink.site/pagar/pedidopt",
      ]) {
        const content = buildStoreNoticeLinkContent(STORE_NOTICE_PREFERENCES, {
          ...NOTICE_LINK_DEFAULTS,
          url,
        });
        for (const mode of ["test", "send"]) {
          const result = await sendCampaignAction(
            null,
            form({
              ...content,
              segment,
              campaignKind: "notice-link",
              mode,
              testEmail: "admin@example.com",
            }),
          );
          expect(result.ok).toBe(false);
          expect(result.error).toContain("Use o comunicado sem botão");
        }
      }
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
      expect(mocks.getDb).not.toHaveBeenCalled();
      expect(mocks.getSegmentRecipients).not.toHaveBeenCalled();
    },
  );

  it.each(["test", "send"])(
    "rejeita URL e mensagem adulteradas antes do envio %s",
    async (mode) => {
      const content = buildStoreNoticeLinkContent(STORE_NOTICE_PREFERENCES, {
        ...NOTICE_LINK_DEFAULTS,
        url: "https://externo.example",
      });
      for (const changed of [
        { ctaUrl: "javascript:alert(1)" },
        { body: content.body.replace("comunicação informativa", "cobrança") },
        { ctaLabel: "Pague uma taxa para libertar" },
      ]) {
        expect(
          (
            await sendCampaignAction(
              null,
              form({
                ...content,
                ...changed,
                segment: "all",
                campaignKind: "notice-link",
                mode,
                testEmail: "admin@example.com",
              }),
            )
          ).ok,
        ).toBe(false);
      }
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
      expect(mocks.getDb).not.toHaveBeenCalled();
    },
  );
  it.each(["all", "paid", "no_orders"])(
    "envia comunicado com checkout ao público %s sem exigir pedidos pendentes",
    async (segment) => {
      const values = vi.fn().mockReturnValue({
        onConflictDoNothing: () => ({
          returning: async () => [{ id: "campaign" }],
        }),
        onConflictDoUpdate: async () => undefined,
      });
      const db = {
        insert: vi.fn().mockReturnValue({ values }),
        update: vi
          .fn()
          .mockReturnValue({ set: () => ({ where: async () => undefined }) }),
        selectDistinct: vi.fn(),
      };
      mocks.getDb.mockReturnValue(db);
      mocks.getSegmentRecipients.mockResolvedValue([
        { id: "a", name: "Ana", email: "ana@example.com", orderId: null },
      ]);
      mocks.validateStoreOffer.mockResolvedValue({ offer });
      mocks.sendEmailBatch.mockResolvedValue({ ok: true, externalIds: ["a"] });
      const content = buildStoreNoticeOfferContent(
        {
          ...STORE_NOTICE_PREFERENCES,
          customMessage: "Confira as novidades da nossa loja.",
        },
        offer,
        "Ver oferta e comprar",
      );
      const result = await sendCampaignAction(
        null,
        form({
          ...content,
          segment,
          campaignKind: "notice-offer",
          offerUrl: offer.checkoutUrl,
        }),
      );
      expect(result).toMatchObject({ ok: true, total: 1, queued: 1 });
      expect(mocks.getSegmentRecipients).toHaveBeenCalledWith(segment, false);
      const html = mocks.sendEmailBatch.mock.calls[0][0][0].html;
      expect(html).toContain(`href="${offer.checkoutUrl}"`);
      expect(html).toContain("Confira as novidades da nossa loja.");
      expect(html).toContain("background:#cc0000");
      expect(html).not.toContain("Encomenda:");
      expect(values.mock.calls[0][0].content).toMatchObject({
        notificationKind: STORE_NOTICE_OFFER_KIND,
        ctaUrl: offer.checkoutUrl,
        offer,
      });
      expect(db.selectDistinct).not.toHaveBeenCalled();
    },
  );

  it.each(["all", "paid", "no_orders"])(
    "inclui checkout e mensagem no e-mail de teste do público %s",
    async (segment) => {
      mocks.validateStoreOffer.mockResolvedValue({ offer });
      mocks.sendEmail.mockResolvedValue({ ok: true, externalId: "test" });
      const content = buildStoreNoticeOfferContent(
        {
          ...STORE_NOTICE_PREFERENCES,
          customMessage: "Novidades disponíveis.",
        },
        offer,
        "Ver oferta e comprar",
      );
      expect(
        (
          await sendCampaignAction(
            null,
            form({
              ...content,
              segment,
              campaignKind: "notice-offer",
              offerUrl: offer.checkoutUrl,
              mode: "test",
              testEmail: "admin@example.com",
            }),
          )
        ).ok,
      ).toBe(true);
      const html = mocks.sendEmail.mock.calls[0][0].html;
      expect(html).toContain(`href="${offer.checkoutUrl}"`);
      expect(html).toContain("Novidades disponíveis.");
      expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
    },
  );
  it.each(["all", "paid", "no_orders"])(
    "envia nova oferta opcional validada ao público %s sem reduzir aos pendentes",
    async (segment) => {
      const values = vi.fn().mockReturnValue({
        onConflictDoNothing: () => ({
          returning: async () => [{ id: "campaign" }],
        }),
        onConflictDoUpdate: async () => undefined,
      });
      const db = {
        insert: vi.fn().mockReturnValue({ values }),
        update: vi
          .fn()
          .mockReturnValue({ set: () => ({ where: async () => undefined }) }),
        selectDistinct: vi.fn(),
      };
      mocks.getDb.mockReturnValue(db);
      mocks.getSegmentRecipients.mockResolvedValue([
        { id: "a", name: "Ana", email: "ana@example.com", orderId: null },
        { id: "b", name: "João", email: "joao@example.com", orderId: null },
      ]);
      mocks.validateStoreOffer.mockResolvedValue({ offer });
      mocks.sendEmailBatch.mockResolvedValue({
        ok: true,
        externalIds: ["a", "b"],
      });
      const result = await sendCampaignAction(
        null,
        form({
          ...buildStoreOfferContent(offer),
          segment,
          campaignKind: "offer",
          offerUrl: offer.checkoutUrl,
        }),
      );
      expect(result).toMatchObject({ ok: true, total: 2, queued: 2 });
      expect(mocks.getSegmentRecipients).toHaveBeenCalledWith(segment, false);
      const sent = mocks.sendEmailBatch.mock.calls[0][0];
      expect(sent).toHaveLength(2);
      expect(sent[0].html).toContain(`href="${offer.checkoutUrl}"`);
      expect(sent[0].html).toContain("Esta compra é opcional");
      expect(sent[0].html).toContain("39,99");
      expect(values.mock.calls[0][0].content.offer).toEqual(offer);
      expect(db.selectDistinct).not.toHaveBeenCalled();
    },
  );

  it.each(["test", "send"])(
    "rejeita oferta alterada ou preço desatualizado antes do envio (%s)",
    async (mode) => {
      mocks.validateStoreOffer.mockResolvedValue({
        offer: { ...offer, priceCents: 4999 },
      });
      const result = await sendCampaignAction(
        null,
        form({
          ...buildStoreOfferContent(offer),
          segment: "all",
          campaignKind: "offer",
          offerUrl: offer.checkoutUrl,
          mode,
          testEmail: "admin@example.com",
        }),
      );
      expect(result.ok).toBe(false);
      expect(result.error).toContain("oferta mudou");
      expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
      expect(mocks.sendEmail).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["headerName", "Outra empresa"],
    ["ctaUrl", "https://example.com/pagar"],
    ["body", "A encomenda está retida. Efetue o pagamento."],
  ])(
    "rejects edited content before reaching the database or provider",
    async (field, value) => {
      const result = await sendCampaignAction(null, form({ [field]: value }));
      expect(result.ok).toBe(false);
      expect(mocks.getDb).not.toHaveBeenCalled();
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
    },
  );

  it("rejects an imported customer without an associated local order", async () => {
    mocks.getSegmentRecipients.mockResolvedValue([
      { id: "customer", email: "cliente@example.com", orderId: null },
    ]);
    const result = await sendCampaignAction(null, form());
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Nenhum pedido elegível");
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
  });

  it("rejects a sender identity from another company", async () => {
    vi.stubEnv(
      "RESEND_FROM_EMAIL",
      "Outra empresa <notificacoes@encomendapgcvip.site>",
    );
    expect((await sendCampaignAction(null, form())).ok).toBe(false);
    expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
  });

  it("accepts the published model after multipart form serialization", async () => {
    mocks.sendEmail.mockResolvedValue({ ok: true, externalId: "test-id" });
    const request = new Request("https://example.com", {
      method: "POST",
      body: form({ mode: "test", testEmail: "admin@example.com" }),
    });
    const received = await request.formData();
    expect(received.get("body")).toContain("\r\n");
    const result = await sendCampaignAction(null, received);
    expect(result.ok).toBe(true);
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
    expect(mocks.sendEmail.mock.calls[0][0].html).not.toContain("\r\n");
    expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
  });

  it("sends the selected store message and subject through the provider", async () => {
    mocks.sendEmail.mockResolvedValue({ ok: true, externalId: "test-id" });
    const content = buildNotificationContent({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      subject: NOTIFICATION_OPTIONS.subject[2],
      greeting: 2,
      closing: 1,
      showValue: false,
    });
    const request = new Request("https://example.com", {
      method: "POST",
      body: form({ ...content, mode: "test", testEmail: "admin@example.com" }),
    });
    const result = await sendCampaignAction(null, await request.formData());
    expect(result.ok).toBe(true);
    const sent = mocks.sendEmail.mock.calls[0][0];
    expect(sent.subject).toBe("[TESTE] PCCGVIP — resumo do pedido PED-1234");
    expect(sent.html).toContain("Com os melhores cumprimentos");
    expect(sent.html).not.toContain("Valor do pedido:");
    expect(sent.html).not.toContain("href=");
  });

  it.each(["all", "paid", "no_orders"])(
    "envia comunicado ao público %s sem exigir pedidos e sem duplicar e-mails",
    async (segment) => {
      const values = vi.fn().mockReturnValue({
        onConflictDoNothing: () => ({
          returning: async () => [{ id: "campaign" }],
        }),
        onConflictDoUpdate: async () => undefined,
      });
      const db = {
        insert: vi.fn().mockReturnValue({ values }),
        update: vi
          .fn()
          .mockReturnValue({ set: () => ({ where: async () => undefined }) }),
        selectDistinct: vi.fn(),
      };
      mocks.getDb.mockReturnValue(db);
      mocks.getSegmentRecipients.mockResolvedValue([
        {
          id: "first",
          email: "CLIENTE@example.com",
          name: "Maria",
          orderId: null,
        },
        {
          id: "duplicate",
          email: "cliente@example.com",
          name: "Maria",
          orderId: "imported",
        },
        {
          id: "second",
          email: "joao@example.com",
          name: "João",
          orderId: "old-order",
          checkoutUrl: "https://example.com/pagar/old",
          orderReference: "OLD-123",
        },
        { id: "invalid", email: "inválido", name: "Inválido", orderId: null },
      ]);
      mocks.sendEmailBatch.mockResolvedValue({
        ok: true,
        externalIds: ["a", "b"],
      });
      const result = await sendCampaignAction(
        null,
        form({
          ...buildStoreNoticeContent(STORE_NOTICE_PREFERENCES),
          segment,
        }),
      );
      expect(result).toMatchObject({ ok: true, total: 2, queued: 2 });
      expect(mocks.getSegmentRecipients).toHaveBeenCalledWith(segment, false);
      expect(db.selectDistinct).not.toHaveBeenCalled();
      const emails = mocks.sendEmailBatch.mock.calls[0][0];
      expect(emails.map((email: { to: string }) => email.to)).toEqual([
        "cliente@example.com",
        "joao@example.com",
      ]);
      for (const email of emails) {
        expect(email.html).not.toContain("href=");
        expect(email.html).not.toContain("Encomenda:");
        expect(email.html).not.toContain("OLD-123");
      }
      expect(values.mock.calls[0][0].content).toMatchObject({
        notificationKind: STORE_NOTICE_KIND,
        ctaUrl: "",
      });
    },
  );

  it.each([
    ["all", "test"],
    ["all", "send"],
    ["paid", "test"],
    ["paid", "send"],
    ["no_orders", "test"],
    ["no_orders", "send"],
  ])(
    "rejeita checkout no público %s antes do provedor (%s)",
    async (segment, mode) => {
      const result = await sendCampaignAction(
        null,
        form({
          ...buildStoreNoticeContent(STORE_NOTICE_PREFERENCES),
          segment,
          mode,
          ctaUrl: "https://suaempresacto.site/pagar/v4nfdiydvd",
          testEmail: "admin@example.com",
        }),
      );
      expect(result.ok).toBe(false);
      expect(mocks.getSegmentRecipients).not.toHaveBeenCalled();
      expect(mocks.getDb).not.toHaveBeenCalled();
      expect(mocks.sendEmail).not.toHaveBeenCalled();
      expect(mocks.sendEmailBatch).not.toHaveBeenCalled();
    },
  );

  it.each(["all", "paid", "no_orders"])(
    "gera teste informativo para %s sem dados de pedido",
    async (segment) => {
      mocks.sendEmail.mockResolvedValue({ ok: true, externalId: "test-id" });
      const result = await sendCampaignAction(
        null,
        form({
          ...buildStoreNoticeContent(STORE_NOTICE_PREFERENCES),
          segment,
          mode: "test",
          testEmail: "admin@example.com",
        }),
      );
      expect(result.ok).toBe(true);
      expect(mocks.sendEmail.mock.calls[0][0].html).not.toContain("Encomenda:");
      expect(mocks.sendEmail.mock.calls[0][0].html).not.toContain("href=");
    },
  );
});
