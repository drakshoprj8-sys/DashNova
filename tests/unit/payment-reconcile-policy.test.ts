import { describe, expect, it } from "vitest";
import {
  canApplyGatewayPaymentStatus,
  matchesGatewayPayment,
} from "@/features/payments/reconcile-policy";

describe("gateway payment reconciliation", () => {
  it("accepts a late approval after expiration, and protects it from stale pending events", () => {
    expect(canApplyGatewayPaymentStatus("expired", "approved")).toBe(true);
    expect(canApplyGatewayPaymentStatus("approved", "pending")).toBe(false);
    expect(canApplyGatewayPaymentStatus("refunded", "approved")).toBe(false);
    expect(canApplyGatewayPaymentStatus("pending", "processing")).toBe(true);
  });
  it("requires the same amount, currency, method, gateway ID and order reference", () => {
    const expected = {
      externalId: "ord_1",
      orderId: "order-1",
      amountCents: 4990,
      currency: "EUR",
      method: "mbway",
    };
    const result = {
      externalId: "ord_1",
      amountCents: 4990,
      currency: "EUR",
      method: "mbway",
      raw: { external_reference: "order-1" },
    };
    expect(matchesGatewayPayment(expected, result)).toBe(true);
    expect(
      matchesGatewayPayment(expected, { ...result, amountCents: 699 }),
    ).toBe(false);
    expect(
      matchesGatewayPayment(expected, {
        ...result,
        raw: { external_reference: "other-order" },
      }),
    ).toBe(false);
    expect(
      matchesGatewayPayment(expected, { ...result, currency: "BRL" }),
    ).toBe(false);
    expect(
      matchesGatewayPayment(expected, { ...result, externalId: "ord_2" }),
    ).toBe(false);
  });
});
