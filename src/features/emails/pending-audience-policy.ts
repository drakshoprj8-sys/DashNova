import { verifiedCheckoutUrl } from "./verified-checkout";

/**
 * Diagnóstico (somente leitura) de por que um cliente "pendente" da aba
 * Clientes entra, ou não, no público "Pagamento pendente" dos e-mails.
 *
 * Não decide quem recebe e-mail: espelha as regras que já existem em
 * `segments.ts` (o que aparece no card) e em `actions.ts` (a verificação
 * feita no envio). Se uma dessas regras mudar, ajuste aqui também — o teste
 * de integração compara a contagem do card com este resumo para denunciar
 * qualquer divergência.
 */

/** Motivos de um pedido isolado, do mais distante ao mais próximo de ser enviável. */
export const ORDER_REASONS = [
  "not_awaiting_payment",
  "paid_or_imported_order",
  "no_checkout_url",
  "order_closed",
  "no_gateway_payment",
  "link_not_verified",
  "sendable",
] as const;
export type PendingOrderReason = (typeof ORDER_REASONS)[number];

export const CUSTOMER_REASONS = [
  "blocked_or_opted_out",
  "suppressed",
  "imported_only",
] as const;

export type PendingAudienceReason =
  PendingOrderReason | (typeof CUSTOMER_REASONS)[number];

/** Motivos que ainda aparecem no card "Pagamento pendente" (caem só no envio). */
const LISTED_REASONS: readonly PendingAudienceReason[] = [
  "order_closed",
  "no_gateway_payment",
  "link_not_verified",
  "sendable",
];

export interface PendingOrderRow {
  status: string;
  origin: string | null;
  paidAt: Date | null;
  importBatchId: string | null;
  archivedAt: Date | null;
  refundedAt: Date | null;
  chargebackAt: Date | null;
  checkoutUrl: string | null;
  checkoutStatus: string | null;
  checkoutDeletedAt: Date | null;
  checkoutSlug: string | null;
  linkStatus: string | null;
  linkDeletedAt: Date | null;
  linkSlug: string | null;
  hasProductItem: boolean;
  hasLivePayment: boolean;
  hasLiveProductionPayment: boolean;
}

export interface PendingOrderFacts {
  awaitingPayment: boolean;
  paidOrImported: boolean;
  hasCheckoutUrl: boolean;
  closed: boolean;
  hasLivePayment: boolean;
  linkVerified: boolean;
}

export interface PendingCustomerFacts {
  blockedOrOptedOut: boolean;
  suppressed: boolean;
  importedPending: boolean;
  orders: PendingOrderFacts[];
}

/** Traduz as colunas do banco nos fatos usados pela classificação. */
export function buildPendingOrderFacts(
  row: PendingOrderRow,
  appUrl: string,
): PendingOrderFacts {
  // Mesma escolha de `actions.ts`: o checkout publicado tem precedência e só
  // depois o link de pagamento publicado.
  const verifiedUrl =
    row.checkoutStatus === "published" && row.checkoutSlug
      ? verifiedCheckoutUrl(
          row.checkoutUrl,
          row.checkoutSlug,
          "checkout",
          appUrl,
        )
      : row.linkStatus === "published"
        ? verifiedCheckoutUrl(
            row.checkoutUrl,
            row.linkSlug,
            "payment-link",
            appUrl,
          )
        : null;

  const checkoutOrigin =
    row.origin === "checkout" || row.origin === "landing_page";
  const sourcePublished = checkoutOrigin
    ? row.checkoutStatus === "published" &&
      row.checkoutDeletedAt === null &&
      row.hasProductItem
    : row.origin === "payment_link"
      ? row.linkStatus === "published" &&
        row.linkDeletedAt === null &&
        row.hasLiveProductionPayment
      : false;

  return {
    awaitingPayment: row.status === "awaiting_payment",
    paidOrImported: row.paidAt !== null || row.importBatchId !== null,
    hasCheckoutUrl: Boolean(row.checkoutUrl),
    closed:
      row.archivedAt !== null ||
      row.refundedAt !== null ||
      row.chargebackAt !== null,
    hasLivePayment: row.hasLivePayment,
    linkVerified: sourcePublished && verifiedUrl !== null,
  };
}

export function classifyPendingOrder(
  order: PendingOrderFacts,
): PendingOrderReason {
  if (!order.awaitingPayment) return "not_awaiting_payment";
  if (order.paidOrImported) return "paid_or_imported_order";
  if (!order.hasCheckoutUrl) return "no_checkout_url";
  if (order.closed) return "order_closed";
  if (!order.hasLivePayment) return "no_gateway_payment";
  if (!order.linkVerified) return "link_not_verified";
  return "sendable";
}

/**
 * Um cliente vale pelo seu melhor pedido: basta um enviável para ele entrar.
 * Bloqueio, descadastro e supressão valem para o cliente inteiro.
 */
export function classifyPendingCustomer(
  customer: PendingCustomerFacts,
): PendingAudienceReason {
  if (customer.blockedOrOptedOut) return "blocked_or_opted_out";
  if (customer.suppressed) return "suppressed";
  if (customer.orders.length === 0) return "imported_only";

  return customer.orders
    .map(classifyPendingOrder)
    .reduce((best, reason) =>
      ORDER_REASONS.indexOf(reason) > ORDER_REASONS.indexOf(best)
        ? reason
        : best,
    );
}

export interface PendingAudienceSummary {
  /** Clientes pendentes na aba Clientes (pedido pendente ou pendente informado). */
  total: number;
  /** Quantos aparecem no card "Pagamento pendente". */
  listed: number;
  /** Quantos ainda passam na verificação feita no envio. */
  sendable: number;
  byReason: Record<PendingAudienceReason, number>;
}

export function summarizePendingAudience(
  reasons: readonly PendingAudienceReason[],
): PendingAudienceSummary {
  const byReason = Object.fromEntries(
    [...ORDER_REASONS, ...CUSTOMER_REASONS].map((reason) => [reason, 0]),
  ) as Record<PendingAudienceReason, number>;
  for (const reason of reasons) byReason[reason] += 1;

  return {
    total: reasons.length,
    listed: LISTED_REASONS.reduce((sum, reason) => sum + byReason[reason], 0),
    sendable: byReason.sendable,
    byReason,
  };
}

export const PENDING_REASON_COPY: Record<
  Exclude<PendingAudienceReason, "sendable">,
  { label: string; description: string }
> = {
  link_not_verified: {
    label: "Checkout ou link sem publicação",
    description:
      "O checkout ou link de pagamento do pedido não está publicado (ou o endereço guardado não confere). Aparecem no card, mas o envio os descarta.",
  },
  no_gateway_payment: {
    label: "Sem pagamento ativo no gateway",
    description:
      "Não há pagamento em andamento no gateway para o valor do pedido. Aparecem no card, mas o envio os descarta.",
  },
  order_closed: {
    label: "Pedido arquivado ou reembolsado",
    description:
      "O pedido foi arquivado, reembolsado ou contestado. Aparecem no card, mas o envio os descarta.",
  },
  no_checkout_url: {
    label: "Pedido sem link de checkout",
    description: "O pedido não guardou o endereço para retomar o pagamento.",
  },
  paid_or_imported_order: {
    label: "Pedido já pago ou importado",
    description:
      "Pedidos pagos ou vindos de importação não são lembrados como pendentes.",
  },
  not_awaiting_payment: {
    label: "Pedido ainda não aguarda pagamento",
    description:
      "A aba Clientes conta pedidos criados ou em processamento; os e-mails só usam pedidos aguardando pagamento.",
  },
  imported_only: {
    label: "Pendente informado (importado)",
    description:
      "Sem pedido real. Recebem apenas comunicado, pelo público «Pendentes da outra loja».",
  },
  suppressed: {
    label: "Descadastrados, bounce ou queixa",
    description: "Estão na lista de supressão e nunca recebem campanhas.",
  },
  blocked_or_opted_out: {
    label: "Bloqueados ou sem consentimento",
    description: "Pediram para não receber comunicações ou estão bloqueados.",
  },
};
