const PAYMENT_PROGRESS: Record<string, number> = {
  created: 0,
  pending: 1,
  processing: 2,
  refused: 3,
  expired: 3,
  cancelled: 3,
  approved: 4,
  partially_refunded: 5,
  refunded: 6,
  chargeback: 6,
};

export function canApplyGatewayPaymentStatus(
  current: string,
  next: string,
): boolean {
  return (
    current === next ||
    (PAYMENT_PROGRESS[next] ?? -1) > (PAYMENT_PROGRESS[current] ?? -1)
  );
}

export function matchesGatewayPayment(
  expected: {
    externalId: string;
    orderId: string;
    orderReference?: string;
    amountCents: number;
    currency: string;
    method: string;
  },
  actual: {
    externalId: string;
    amountCents: number;
    currency: string;
    method: string;
    raw?: unknown;
  },
): boolean {
  const reference = (actual.raw as { external_reference?: unknown } | undefined)
    ?.external_reference;
  return (
    actual.externalId === expected.externalId &&
    actual.amountCents === expected.amountCents &&
    actual.currency.toUpperCase() === expected.currency.toUpperCase() &&
    actual.method === expected.method &&
    (reference == null ||
      reference === expected.orderId ||
      reference === expected.orderReference)
  );
}
