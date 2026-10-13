import { describe, expect, it } from "vitest";
import { paginateEmailAudience } from "@/features/emails/audience";
import type { Recipient } from "@/features/emails/segments";

const recipient = (
  id: string,
  name: string,
  productName: string | null,
  createdAt: string,
): Recipient => ({
  id,
  name,
  productName,
  createdAt,
  email: `${id}@example.com`,
  orderCount: 0,
  totalSpentCents: 0,
  orderId: null,
  orderReference: null,
  checkoutUrl: null,
  orderTotalCents: null,
  currency: null,
});
const options = { q: "", from: "", to: "", page: 1 };
describe("seleção da base importada", () => {
  it("busca o produto da outra loja sem exigir um pedido novo", () => {
    const rows = [
      recipient("ana", "Ana", "Cadeira Gaming", "2026-10-01"),
      recipient("joao", "João", "JBL", "2026-10-02"),
    ];
    const result = paginateEmailAudience(rows, { ...options, q: "gaming" });
    expect(result.matchingIds).toEqual(["ana"]);
    expect(result.audienceIds).toEqual(["ana", "joao"]);
    expect(result.recipients[0].orderId).toBeNull();
  });
  it("inclui o último dia do intervalo e não perde datas ausentes", () => {
    const rows = [
      recipient("a", "Ana", null, "2026-10-01T12:00:00Z"),
      recipient("b", "Bea", null, "2026-10-02T23:59:59Z"),
      recipient("c", "Caio", null, "2026-10-03T00:00:00Z"),
    ];
    expect(
      paginateEmailAudience(rows, {
        ...options,
        from: "2026-10-01",
        to: "2026-10-02",
      }).matchingIds,
    ).toEqual(["a", "b"]);
    expect(
      paginateEmailAudience(rows, {
        ...options,
        from: "2026-10-03",
        to: "2026-10-01",
      }).total,
    ).toBe(0);
  });
  it("mantém toda a seleção quando o público ocupa várias páginas", () => {
    const rows = Array.from({ length: 205 }, (_, index) =>
      recipient(
        String(index),
        `Cliente ${String(index).padStart(3, "0")}`,
        null,
        "2026-10-01",
      ),
    );
    const result = paginateEmailAudience(rows, { ...options, page: 50 });
    expect(result.page).toBe(3);
    expect(result.recipients).toHaveLength(5);
    expect(result.matchingIds).toHaveLength(205);
    expect(new Set(result.matchingIds).size).toBe(205);
  });
});
