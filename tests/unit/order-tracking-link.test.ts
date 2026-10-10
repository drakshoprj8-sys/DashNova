import { afterEach, describe, expect, it } from "vitest";
import { createTrackingToken, createTrackingUrl, verifyTrackingToken } from "@/features/orders/tracking-link";

const orderId = "11111111-1111-4111-8111-111111111111";
const customerId = "22222222-2222-4222-8222-222222222222";
const originalKey = process.env.ENCRYPTION_KEY;

afterEach(() => { process.env.ENCRYPTION_KEY = originalKey; });

describe("links de acompanhamento", () => {
  it("abre somente um pedido e cliente assinados, durante 30 dias", () => {
    process.env.ENCRYPTION_KEY = "test-key-with-at-least-thirty-two-characters";
    const now = Date.UTC(2026, 9, 8);
    const token = createTrackingToken(orderId, customerId, now);
    expect(verifyTrackingToken(token, now + 1000)).toMatchObject({ orderId, customerId });
    expect(verifyTrackingToken(token, now + 31 * 24 * 60 * 60 * 1000)).toBeNull();
    expect(verifyTrackingToken(`A${token.slice(1)}`, now)).toBeNull();
    expect(createTrackingUrl(orderId, customerId, "https://loja.exemplo.pt")).toContain("https://loja.exemplo.pt/acompanhar/");
    expect(() => createTrackingUrl(orderId, customerId, "http://site-externo.example/path")).toThrow();
  });

  it("exige a chave de assinatura", () => {
    delete process.env.ENCRYPTION_KEY;
    expect(() => createTrackingToken(orderId, customerId)).toThrow();
  });
});
