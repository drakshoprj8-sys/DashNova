import { describe, expect, it } from "vitest";

import { isPathAtOrBelow, safeInternalPath } from "@/lib/path-security";

describe("isPathAtOrBelow", () => {
  it("aceita o caminho exato e seus segmentos filhos", () => {
    expect(isPathAtOrBelow("/api/public", "/api/public")).toBe(true);
    expect(isPathAtOrBelow("/api/public/track", "/api/public")).toBe(true);
  });

  it("recusa prefixos apenas parecidos", () => {
    expect(isPathAtOrBelow("/api/publicity", "/api/public")).toBe(false);
    expect(isPathAtOrBelow("/login-falso", "/login")).toBe(false);
  });
});

describe("safeInternalPath", () => {
  it("preserva um destino interno com query e fragmento", () => {
    expect(
      safeInternalPath("/pedidos?status=paid#recentes", "/dashboard"),
    ).toBe("/pedidos?status=paid#recentes");
  });

  it.each([
    "https://evil.example/roubar",
    "//evil.example/roubar",
    "/\\evil.example/roubar",
    "dashboard",
  ])("recusa destino externo ou ambíguo: %s", (value) => {
    expect(safeInternalPath(value, "/dashboard")).toBe("/dashboard");
  });

  it("usa o fallback para valores que não são string", () => {
    expect(safeInternalPath(null, "/dashboard")).toBe("/dashboard");
  });
});
