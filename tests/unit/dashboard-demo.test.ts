import { describe, expect, it } from "vitest";

import { getDemoDashboardSnapshot } from "@/features/dashboard/demo-snapshot";
import type { DashboardPeriod } from "@/features/dashboard/period";

describe("getDemoDashboardSnapshot", () => {
  const now = new Date("2026-10-03T18:00:00.000Z");
  const periods: DashboardPeriod[] = ["today", "7d", "30d", "90d"];

  it.each(periods)("gera um snapshot consistente para %s", (period) => {
    const snapshot = getDemoDashboardSnapshot(period, now);

    expect(snapshot.period).toBe(period);
    expect(snapshot.revenueCents).toBeGreaterThan(0);
    expect(snapshot.ordersCount).toBeGreaterThan(0);
    expect(snapshot.chartSeries.length).toBeGreaterThan(0);
    expect(
      snapshot.chartSeries.reduce((sum, point) => sum + point.revenueCents, 0),
    ).toBe(snapshot.revenueCents);
    expect(snapshot.generatedAt).toBe(now.toISOString());
  });

  it("expõe apenas os métodos de pagamento suportados", () => {
    const snapshot = getDemoDashboardSnapshot("7d", now);

    expect(snapshot.paymentMethods.map((method) => method.method)).toEqual([
      "mbway",
      "multibanco",
    ]);
    expect(JSON.stringify(snapshot)).not.toMatch(
      /PCDIGA|Stripe|Mercado Pago|Pagar\.me/i,
    );
  });
});
