import { createHmac, timingSafeEqual } from "node:crypto";

const LINK_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TrackingClaim = { orderId: string; customerId: string; expiresAt: number };

function signingKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) throw new Error("ENCRYPTION_KEY não configurada para os links de pedido.");
  return key;
}

export function createTrackingToken(orderId: string, customerId: string, now = Date.now()): string {
  if (!uuidPattern.test(orderId) || !uuidPattern.test(customerId)) throw new Error("Identificador de pedido inválido.");
  const payload = Buffer.from(JSON.stringify({ orderId, customerId, expiresAt: now + LINK_LIFETIME_MS } satisfies TrackingClaim)).toString("base64url");
  const signature = createHmac("sha256", signingKey()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyTrackingToken(token: string, now = Date.now()): TrackingClaim | null {
  if (token.length > 500 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null;
  const [payload, signature] = token.split(".");
  const expected = createHmac("sha256", signingKey()).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const claim: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!claim || typeof claim !== "object") return null;
    const value = claim as Partial<TrackingClaim>;
    if (!value.orderId || !uuidPattern.test(value.orderId) || !value.customerId || !uuidPattern.test(value.customerId)) return null;
    if (typeof value.expiresAt !== "number" || value.expiresAt < now || value.expiresAt > now + LINK_LIFETIME_MS) return null;
    return { orderId: value.orderId, customerId: value.customerId, expiresAt: value.expiresAt };
  } catch {
    return null;
  }
}

export function createTrackingUrl(orderId: string, customerId: string, appUrl: string): string {
  const base = new URL(appUrl);
  if (base.protocol !== "https:" && !(base.protocol === "http:" && base.hostname === "localhost")) throw new Error("URL pública inválida para acompanhar pedidos.");
  return new URL(`/acompanhar/${createTrackingToken(orderId, customerId)}`, base).toString();
}
