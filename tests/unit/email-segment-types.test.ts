import { describe, expect, it } from "vitest";

import { isFixedSegmentKey, SEGMENTS } from "@/features/emails/types";

describe("segmentos de email", () => {
  it("apresenta os pedidos pagos informados na aba Clientes", () => {
    const paid = SEGMENTS.find((segment) => segment.key === "paid");

    expect(paid).toEqual({
      key: "paid",
      label: "Pedidos pagos",
      description: "Pagos informados na aba Clientes",
    });
  });

  it("mantém o público pago identificado para o atalho da aba Clientes", () => {
    expect(SEGMENTS.some((segment) => segment.key === "paid")).toBe(true);
  });

  it("identifica Todos os clientes como a base consolidada de Clientes", () => {
    expect(SEGMENTS.find((segment) => segment.key === "all")).toEqual({
      key: "all",
      label: "Todos os clientes",
      description: "Base consolidada da aba Clientes",
    });
  });

  it("aceita apenas públicos fixos na rota de prévia", () => {
    expect(isFixedSegmentKey("paid")).toBe(true);
    expect(isFixedSegmentKey("pending")).toBe(true);
    expect(isFixedSegmentKey("custom")).toBe(false);
    expect(isFixedSegmentKey("qualquer")).toBe(false);
  });
});
