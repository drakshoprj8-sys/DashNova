import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildStoreOfferContent, buildStoreOfferHtml } from "@/features/emails/store-offer";

const mocks = vi.hoisted(() => ({ session: vi.fn(), checkout: vi.fn(), product: vi.fn(), branding: vi.fn(), variants: vi.fn() }));
vi.mock("@/lib/auth/session", () => ({ getSession: mocks.session }));
vi.mock("@/lib/app-url", () => ({ getAppUrl: () => "https://loja.example" }));
vi.mock("@/features/checkouts/queries", () => ({ getPublishedCheckoutBySlug: mocks.checkout }));
vi.mock("@/features/landing/queries", () => ({ getProductBySlug: mocks.product }));
vi.mock("@/features/branding/queries", () => ({ getWorkspaceBranding: mocks.branding }));
vi.mock("@/features/variants/resolve", () => ({ listCheckoutVariants: mocks.variants, pickDefaultVariant: (items: unknown[]) => items[0] }));
import { validateStoreOfferAction } from "@/features/emails/store-offer-actions";

describe("oferta opcional com checkout de catálogo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ demoMode: false });
    mocks.checkout.mockResolvedValue({ slug: "produto", productSlug: "produto", paymentMethods: ["mbway"] });
    mocks.product.mockResolvedValue({ id: "p", name: "Produto", priceCents: 5900, currency: "EUR", stockRemaining: null });
    mocks.branding.mockResolvedValue({ storeName: "Loja Exemplo" });
    mocks.variants.mockResolvedValue([]);
  });
  it("consulta o mesmo produto e a variação padrão do checkout", async () => {
    mocks.variants.mockResolvedValue([{ label: "256 GB", priceCents: 3999, purchasable: true }]);
    const { offer } = await validateStoreOfferAction("https://loja.example/checkout/produto");
    expect(offer).toMatchObject({ productName: "Produto — 256 GB", priceCents: 3999, storeName: "Loja Exemplo" });
    const content = buildStoreOfferContent(offer!);
    expect(content.body).toContain("39,99");
    const html = buildStoreOfferHtml(offer!, { primeiroNome: "<Ana>", nome: "Ana", email: "ana@example.com", pedido: "OLD123", produto: "antigo", valor: "5", checkoutUrl: "https://evil.test", lojaUrl: "" });
    expect(html).toContain("&lt;Ana&gt;");
    expect(html).toContain("background:#cc0000");
    expect(html).toContain("compra é opcional");
    expect(html).not.toContain("OLD123");
    expect(html).not.toContain("evil.test");
  });
  it.each(["https://evil.test/checkout/produto", "https://loja.example/pagar/taxa", "https://loja.example/checkout/produto?redirect=evil", "https://loja.example/checkout/produto#x", "https://user@loja.example/checkout/produto", "javascript:alert(1)"])("rejeita URL não correspondente à oferta: %s", async (url) => {
    expect((await validateStoreOfferAction(url)).error).toBeTruthy();
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it("exige autenticação", async () => {
    mocks.session.mockResolvedValue(null);
    expect((await validateStoreOfferAction("https://loja.example/checkout/produto")).error).toBe("Não autenticado.");
    expect(mocks.checkout).not.toHaveBeenCalled();
  });
  it("rejeita checkout retirado do ar", async () => {
    mocks.checkout.mockResolvedValue(null);
    expect((await validateStoreOfferAction("https://loja.example/checkout/produto")).offer).toBeUndefined();
  });
  it("rejeita serviço de liberação disfarçado de produto", async () => {
    mocks.product.mockResolvedValue({ id: "p", name: "Taxa de libertação", priceCents: 699, currency: "EUR", stockRemaining: null });
    expect((await validateStoreOfferAction("https://loja.example/checkout/produto")).error).toBeTruthy();
  });
});
