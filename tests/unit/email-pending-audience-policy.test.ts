import { describe, expect, it } from "vitest";

import {
  buildPendingOrderFacts,
  classifyPendingCustomer,
  classifyPendingOrder,
  summarizePendingAudience,
  type PendingOrderFacts,
  type PendingOrderRow,
} from "@/features/emails/pending-audience-policy";

const APP_URL = "https://loja.exemplo.pt";

const sendableOrder: PendingOrderFacts = {
  awaitingPayment: true,
  paidOrImported: false,
  hasCheckoutUrl: true,
  closed: false,
  hasLivePayment: true,
  linkVerified: true,
};

const checkoutRow: PendingOrderRow = {
  status: "awaiting_payment",
  origin: "checkout",
  paidAt: null,
  importBatchId: null,
  archivedAt: null,
  refundedAt: null,
  chargebackAt: null,
  checkoutUrl: `${APP_URL}/checkout/produto`,
  checkoutStatus: "published",
  checkoutDeletedAt: null,
  checkoutSlug: "produto",
  linkStatus: null,
  linkDeletedAt: null,
  linkSlug: null,
  hasProductItem: true,
  hasLivePayment: true,
  hasLiveProductionPayment: true,
};

describe("classifyPendingOrder", () => {
  it("aceita só pedidos aguardando pagamento com tudo verificado", () => {
    expect(classifyPendingOrder(sendableOrder)).toBe("sendable");
  });

  it.each([
    [{ awaitingPayment: false }, "not_awaiting_payment"],
    [{ paidOrImported: true }, "paid_or_imported_order"],
    [{ hasCheckoutUrl: false }, "no_checkout_url"],
    [{ closed: true }, "order_closed"],
    [{ hasLivePayment: false }, "no_gateway_payment"],
    [{ linkVerified: false }, "link_not_verified"],
  ] as const)("%j cai em %s", (patch, reason) => {
    expect(classifyPendingOrder({ ...sendableOrder, ...patch })).toBe(reason);
  });

  it("aponta a primeira regra que falha, na ordem do card e depois do envio", () => {
    expect(
      classifyPendingOrder({
        ...sendableOrder,
        hasCheckoutUrl: false,
        hasLivePayment: false,
        linkVerified: false,
      }),
    ).toBe("no_checkout_url");
  });
});

describe("buildPendingOrderFacts", () => {
  it("verifica checkout publicado cujo endereço confere com o slug", () => {
    const facts = buildPendingOrderFacts(checkoutRow, APP_URL);
    expect(classifyPendingOrder(facts)).toBe("sendable");
  });

  it("descarta checkout não publicado", () => {
    const facts = buildPendingOrderFacts(
      { ...checkoutRow, checkoutStatus: "draft" },
      APP_URL,
    );
    expect(classifyPendingOrder(facts)).toBe("link_not_verified");
  });

  it("descarta quando o endereço guardado não é o do slug", () => {
    const facts = buildPendingOrderFacts(
      { ...checkoutRow, checkoutUrl: `${APP_URL}/checkout/outro` },
      APP_URL,
    );
    expect(classifyPendingOrder(facts)).toBe("link_not_verified");
  });

  it("descarta checkout sem produto do catálogo", () => {
    const facts = buildPendingOrderFacts(
      { ...checkoutRow, hasProductItem: false },
      APP_URL,
    );
    expect(classifyPendingOrder(facts)).toBe("link_not_verified");
  });

  const linkRow: PendingOrderRow = {
    ...checkoutRow,
    origin: "payment_link",
    checkoutUrl: `${APP_URL}/pagar/link`,
    checkoutStatus: null,
    checkoutSlug: null,
    linkStatus: "published",
    linkSlug: "link",
  };

  it("aceita link de pagamento publicado com pagamento em produção", () => {
    const facts = buildPendingOrderFacts(linkRow, APP_URL);
    expect(classifyPendingOrder(facts)).toBe("sendable");
  });

  it("descarta link de pagamento pausado", () => {
    const facts = buildPendingOrderFacts(
      { ...linkRow, linkStatus: "paused" },
      APP_URL,
    );
    expect(classifyPendingOrder(facts)).toBe("link_not_verified");
  });

  it("descarta link de pagamento sem pagamento de produção", () => {
    const facts = buildPendingOrderFacts(
      { ...linkRow, hasLiveProductionPayment: false },
      APP_URL,
    );
    expect(classifyPendingOrder(facts)).toBe("link_not_verified");
  });

  it("marca pedidos pagos, importados e arquivados", () => {
    expect(
      buildPendingOrderFacts({ ...checkoutRow, paidAt: new Date() }, APP_URL)
        .paidOrImported,
    ).toBe(true);
    expect(
      buildPendingOrderFacts({ ...checkoutRow, importBatchId: "lote" }, APP_URL)
        .paidOrImported,
    ).toBe(true);
    expect(
      buildPendingOrderFacts(
        { ...checkoutRow, archivedAt: new Date() },
        APP_URL,
      ).closed,
    ).toBe(true);
  });
});

describe("classifyPendingCustomer", () => {
  const base = {
    blockedOrOptedOut: false,
    suppressed: false,
    importedPending: false,
    orders: [sendableOrder],
  };

  it("usa o melhor pedido do cliente", () => {
    expect(
      classifyPendingCustomer({
        ...base,
        orders: [{ ...sendableOrder, awaitingPayment: false }, sendableOrder],
      }),
    ).toBe("sendable");
    expect(
      classifyPendingCustomer({
        ...base,
        orders: [
          { ...sendableOrder, awaitingPayment: false },
          { ...sendableOrder, hasLivePayment: false },
        ],
      }),
    ).toBe("no_gateway_payment");
  });

  it("bloqueio e supressão valem para o cliente inteiro", () => {
    expect(classifyPendingCustomer({ ...base, blockedOrOptedOut: true })).toBe(
      "blocked_or_opted_out",
    );
    expect(classifyPendingCustomer({ ...base, suppressed: true })).toBe(
      "suppressed",
    );
  });

  it("pendente importado sem pedido real nunca é enviável", () => {
    expect(
      classifyPendingCustomer({ ...base, importedPending: true, orders: [] }),
    ).toBe("imported_only");
  });
});

describe("summarizePendingAudience", () => {
  it("separa o que aparece no card do que passa no envio", () => {
    const summary = summarizePendingAudience([
      "sendable",
      "sendable",
      "no_gateway_payment",
      "link_not_verified",
      "order_closed",
      "imported_only",
      "no_checkout_url",
      "suppressed",
    ]);

    expect(summary.total).toBe(8);
    expect(summary.listed).toBe(5);
    expect(summary.sendable).toBe(2);
    expect(summary.byReason.imported_only).toBe(1);
    expect(
      Object.values(summary.byReason).reduce((sum, value) => sum + value, 0),
    ).toBe(summary.total);
  });

  it("começa tudo em zero para uma lista vazia", () => {
    const summary = summarizePendingAudience([]);
    expect(summary).toMatchObject({ total: 0, listed: 0, sendable: 0 });
  });
});
