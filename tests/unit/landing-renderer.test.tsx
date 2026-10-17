import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { LandingRenderer } from "@/features/landing-pages/render/landing-renderer";
import OzamaDescription from "@/features/landing-pages/render/ozama-description";
import { DEFAULT_THEME } from "@/features/landing-pages/defaults";
import {
  readHeaderSettings,
  withWorkspaceHeader,
} from "@/features/branding/header-theme";
import { DEFAULT_BRANDING } from "@/features/branding/queries";
import { createBlock } from "@/features/landing-pages/block-catalog";
import type {
  BlockPropValue,
  LandingBlock,
  LandingProductData,
  LandingSnapshot,
} from "@/features/landing-pages/types";

const PRODUCT: LandingProductData = {
  id: "prod-1",
  slug: "cadeira-teste",
  name: "Cadeira de Teste",
  shortDescription: "Confortável e barata",
  description: "Descrição longa do produto.",
  priceCents: 4990,
  comparePriceCents: 9990,
  currency: "EUR",
  mainImageUrl: "https://cdn.example/cadeira.jpg",
  gallery: ["https://cdn.example/cadeira.jpg"],
  variants: [],
  variantOptionName: "Cor",
  trackInventory: false,
  stockQuantity: 0,
  checkoutSlug: "checkout-cadeira",
};

function snapshotWith(blocks: LandingBlock[]): LandingSnapshot {
  return {
    version: 1,
    publicName: "Loja Teste",
    logoUrl: null,
    faviconUrl: null,
    language: "pt-PT",
    currency: "EUR",
    content: { blocks },
    theme: DEFAULT_THEME,
    seo: {
      title: "",
      description: "",
      keywords: "",
      canonicalUrl: "",
      shareImageUrl: "",
      twitterCard: "summary_large_image",
      noIndex: false,
      productSchema: true,
    },
    tracking: {
      metaPixelId: "",
      tiktokPixelId: "",
      ga4MeasurementId: "",
      gtmContainerId: "",
      defaultUtm: "",
      inheritWorkspacePixels: true,
      countGeneratedOrdersAsPurchase: null,
    },
    customCode: {
      headCode: "",
      bodyStartCode: "",
      bodyEndCode: "",
      css: "",
      javascript: "",
    },
    product: PRODUCT,
    publishedAt: new Date("2026-01-01").toISOString(),
  };
}

function block(
  type: Parameters<typeof createBlock>[0],
  props: Record<string, BlockPropValue> = {},
): LandingBlock {
  const created = createBlock(type);
  return { ...created, props: { ...created.props, ...props } };
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: true })))),
  );
});

describe("LandingRenderer", () => {
  it("preserva os contêineres da descrição visual após higienizar o HTML", () => {
    const { container } = render(<OzamaDescription />);
    const hero = container.querySelector(".ozama-hero");
    expect(hero?.querySelector(".ozama-main-title")).not.toBeNull();
    expect(hero?.querySelector('img[src="/landing/ozama-alpha.webp"]')).not.toBeNull();
    expect(container.querySelector(".ozama-footer")).not.toBeNull();
    expect(container.querySelector("script, iframe")).toBeNull();
  });

  it("alterna entre descrição com imagem e envios por clique e teclado", () => {
    render(
      <LandingRenderer
        snapshot={snapshotWith([
          block("description", {
            showShippingTab: true,
            imageUrl: "/landing/ozama-alpha.webp",
            shippingText: "Entrega em 2 a 4 dias úteis.",
          }),
        ])}
        reviews={[]}
        pageId="tabs-page"
        mode="editor"
      />,
    );
    const description = screen.getByRole("tab", {
      name: "Descrição",
    });
    const shipping = screen.getByRole("tab", {
      name: "Envios & Devoluções",
    });
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(
      description.id,
    );
    expect(
      screen.getByRole("img", { name: "Cadeira de Teste" }).getAttribute("src"),
    ).toBe("/landing/ozama-alpha.webp");
    fireEvent.click(shipping);
    expect(screen.getByRole("tabpanel").textContent).toContain(
      "Entrega em 2 a 4 dias úteis.",
    );
    fireEvent.keyDown(shipping, { key: "ArrowLeft" });
    expect(description.getAttribute("aria-selected")).toBe("true");
  });

  it("calcula resumo e distribuição somente com as avaliações publicadas", () => {
    const reviews = [
      {
        name: "Cliente A",
        location: "Porto",
        date: "16/10/2026",
        stars: 5,
        title: "Confortável",
        text: "Gostei da cadeira.",
        helpful: 2,
        verifiedPurchase: true,
      },
      {
        name: "Cliente B",
        location: "Lisboa",
        date: "15/10/2026",
        stars: 3,
        title: "Boa",
        text: "Ajusta bem.",
        helpful: 0,
        verifiedPurchase: false,
      },
    ];
    const { container } = render(
      <LandingRenderer
        snapshot={snapshotWith([block("reviews")])}
        reviews={reviews}
        pageId="reviews-page"
        mode="editor"
      />,
    );
    expect(screen.getByText("4,0")).toBeTruthy();
    expect(screen.getAllByText("50%").length).toBe(2);
    expect(screen.getAllByText("Compra verificada").length).toBe(1);
    expect(container.querySelectorAll(".lp-review-card").length).toBe(2);
    expect(screen.queryByText("1796")).toBeNull();
  });
  it("renderiza as cores e a identidade escolhidas e permite herdar a configuração global", () => {
    const snapshot = snapshotWith([block("product_offer")]);
    const brand = {
      ...DEFAULT_BRANDING,
      storeName: "Loja Aurora",
      headerBackground: "#123456",
      headerTextColor: "#fedcba",
    };
    expect(withWorkspaceHeader(snapshot, brand)).toBe(snapshot);
    snapshot.theme = { ...snapshot.theme, useWorkspaceHeader: true };
    const inherited = withWorkspaceHeader(snapshot, brand);
    const { container } = render(
      <LandingRenderer
        snapshot={inherited}
        reviews={[]}
        pageId="header-page"
        mode="editor"
      />,
    );
    expect(screen.getByRole("link", { name: "Loja Aurora" })).toBeTruthy();
    expect(
      container.querySelector(".lp-root")?.getAttribute("style"),
    ).toContain("--lp-header-bg: #123456");
    expect(container.querySelector("header")?.getAttribute("style")).toContain(
      "var(--lp-header-bg)",
    );
    expect(
      readHeaderSettings({
        storefrontHeader: { background: "bad", text: "#123456" },
      }),
    ).toEqual({ headerBackground: "#e30613", headerTextColor: "#123456" });
  });
  it("usa a marca da própria landing page no cabeçalho e no rodapé", () => {
    render(
      <LandingRenderer
        snapshot={snapshotWith([
          block("header", { showLogo: false }),
          block("heading", { text: "Produto" }),
          block("footer", { text: "Rodapé antigo" }),
        ])}
        reviews={[]}
        pageId="page-1"
        mode="editor"
      />,
    );

    expect(screen.getByRole("link", { name: "Loja Teste" })).toBeTruthy();
    expect(screen.getAllByText("Loja Teste").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Loja Teste\. Todos os direitos reservados/),
    ).toBeTruthy();
    expect(screen.queryByText(/PCDIGA/i)).toBeNull();
    expect(screen.queryByText("Rodapé antigo")).toBeNull();
    expect(
      screen.getByRole("link", { name: "Termos e Condições" }),
    ).toBeTruthy();
  });

  it("mostra o preço do produto e o desconto calculado", () => {
    render(
      <LandingRenderer
        snapshot={snapshotWith([block("price")])}
        reviews={[]}
        pageId="page-1"
        mode="editor"
      />,
    );

    expect(screen.getByText(/49,90/)).toBeTruthy();
    expect(screen.getByText("-50%")).toBeTruthy();
  });

  it("liga o botão de compra ao checkout real, com quantidade e origem", () => {
    render(
      <LandingRenderer
        snapshot={snapshotWith([block("buy_button", { label: "Comprar já" })])}
        reviews={[]}
        pageId="page-1"
      />,
    );

    const link = screen.getByRole("link", { name: "Comprar já" });
    const href = link.getAttribute("href") ?? "";

    expect(href).toContain("/checkout/checkout-cadeira");
    expect(href).toContain("qty=1");
    expect(href).toContain("lp=page-1");
  });

  it("não renderiza blocos ocultos", () => {
    const hidden: LandingBlock = {
      ...block("heading", { text: "Escondido" }),
      hidden: true,
    };

    render(
      <LandingRenderer
        snapshot={snapshotWith([hidden, block("heading", { text: "Visível" })])}
        reviews={[]}
        pageId="page-1"
        mode="editor"
      />,
    );

    expect(screen.queryByText("Escondido")).toBeNull();
    expect(screen.getByText("Visível")).toBeTruthy();
  });

  it("omite a contagem regressiva sem data configurada", () => {
    const { container } = render(
      <LandingRenderer
        snapshot={snapshotWith([block("countdown", { title: "Termina em" })])}
        reviews={[]}
        pageId="page-1"
        mode="editor"
      />,
    );

    expect(container.querySelector('[data-block-type="countdown"]')).toBeNull();
  });

  it("mostra a contagem quando há uma data futura real", () => {
    const endsAt = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();

    render(
      <LandingRenderer
        snapshot={snapshotWith([
          block("countdown", { title: "Termina em", endsAt }),
        ])}
        reviews={[]}
        pageId="page-1"
        mode="editor"
      />,
    );

    expect(screen.getByText("Termina em")).toBeTruthy();
    expect(screen.getByText("horas")).toBeTruthy();
  });

  it("mostra a mensagem de ausência quando não há avaliações reais", () => {
    render(
      <LandingRenderer
        snapshot={snapshotWith([
          block("reviews", { emptyMessage: "Ainda sem avaliações." }),
        ])}
        reviews={[]}
        pageId="page-1"
        mode="editor"
      />,
    );

    expect(screen.getByText("Ainda sem avaliações.")).toBeTruthy();
  });

  it("lista as avaliações reais recebidas", () => {
    render(
      <LandingRenderer
        snapshot={snapshotWith([block("reviews")])}
        reviews={[
          {
            name: "Ana P.",
            location: "Porto",
            date: "2026-01-10",
            stars: 5,
            title: "Excelente",
            text: "Chegou antes do prazo.",
            helpful: 2,
            verifiedPurchase: true,
          },
        ]}
        pageId="page-1"
        mode="editor"
      />,
    );

    expect(screen.getByText("Ana P.")).toBeTruthy();
    expect(screen.getByText("Compra verificada")).toBeTruthy();
  });

  it("higieniza o HTML personalizado antes de o inserir", () => {
    const { container } = render(
      <LandingRenderer
        snapshot={snapshotWith([
          block("custom_html", {
            html: '<p onclick="mau()">Olá</p><script>alert(1)</script>',
          }),
        ])}
        reviews={[]}
        pageId="page-1"
        mode="editor"
      />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("p")?.getAttribute("onclick")).toBeNull();
    expect(screen.getByText("Olá")).toBeTruthy();
  });

  it("não envia eventos no modo editor", () => {
    render(
      <LandingRenderer
        snapshot={snapshotWith([block("heading", { text: "Título" })])}
        reviews={[]}
        pageId="page-1"
        mode="editor"
      />,
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  it("regista a visita na página publicada", () => {
    render(
      <LandingRenderer
        snapshot={snapshotWith([block("heading", { text: "Título" })])}
        reviews={[]}
        pageId="page-1"
      />,
    );

    expect(fetch).toHaveBeenCalled();
    const [url] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("/api/public/lp-events");
  });
});
