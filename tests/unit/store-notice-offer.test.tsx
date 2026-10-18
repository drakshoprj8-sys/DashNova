import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { CampaignForm } from "@/features/emails/campaign-form";
import { STORE_NOTICE_PREFERENCES } from "@/features/emails/store-notice";
import {
  buildStoreNoticeOfferContent,
  getStoreNoticeOfferValidationError,
} from "@/features/emails/store-notice-offer";
import { OFFER_BUTTONS } from "@/features/emails/store-offer";
import {
  buildStoreNoticeLinkContent,
  getStoreNoticeLinkValidationError,
  isValidNoticeLink,
  NOTICE_LINK_DEFAULTS,
} from "@/features/emails/store-notice-link";

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  send: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/features/emails/actions", () => ({
  sendCampaignAction: mocks.send,
}));
vi.mock("@/features/emails/store-offer-actions", () => ({
  validateStoreOfferAction: mocks.verify,
}));
const offer = {
  storeName: "PCCGVIP",
  productName: "Produto novo",
  priceCents: 3999,
  currency: "EUR",
  checkoutUrl: "https://loja.example/checkout/produto",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.verify.mockResolvedValue({ offer });
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ recipients: [] }) }),
  );
});

describe("comunicados sem links arbitrários", () => {
  it("personaliza o acompanhamento sem oferecer campo para URL e volta ao comunicado ao desativar", async () => {
    await act(async () => {
      render(
        <CampaignForm
          counts={{ all: 2, paid: 1 }}
          resendReady
          pendingRecipients={[]}
          initialSegment="all"
          consolidatedCustomerCount={2}
          consolidatedPaidCustomerCount={1}
          initialDispatchId="00000000-0000-4000-8000-000000000001"
        />,
      );
    });
    const toggle = screen.getByLabelText(
      "Incluir botão de acompanhamento do pedido",
    );
    fireEvent.click(toggle);
    const label = screen.getByLabelText("Texto do botão de acompanhamento");
    fireEvent.change(label, { target: { value: "Ver o meu pedido" } });
    const fields = () => new FormData(label.closest("form")!);
    expect(fields().get("campaignKind")).toBe("order-tracking");
    expect(fields().get("ctaUrl")).toBe("{{CHECKOUT_URL}}");
    expect(fields().get("ctaLabel")).toBe("Ver o meu pedido");
    expect(screen.queryByLabelText("Link do botão")).toBeNull();
    expect(screen.queryByLabelText("Link do produto na sua loja")).toBeNull();
    const preview = screen.getByTitle("Preview do e-mail") as HTMLIFrameElement;
    expect(preview.srcdoc).toContain(
      "pedido.example.invalid/acompanhar/demonstracao",
    );
    expect(preview.srcdoc).toContain("Ver o meu pedido");
    expect(preview.srcdoc).not.toContain("/checkout/");
    expect(preview.srcdoc).toContain("Demonstração");
    fireEvent.change(label, { target: { value: "Pague a taxa do pedido" } });
    expect(
      (
        screen.getByRole("button", {
          name: "Enviar teste",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(toggle);
    expect(
      screen.queryByLabelText("Texto do botão de acompanhamento"),
    ).toBeNull();
    expect(preview.srcdoc).not.toContain("href=");
    expect(mocks.send).not.toHaveBeenCalled();
  });
  it.each(["all", "paid"] as const)(
    "mantém o público %s e prepara apenas o comunicado informativo",
    async (initialSegment) => {
      await act(async () => {
        render(
          <CampaignForm
            counts={{ all: 2, paid: 1, pending: 3 }}
            resendReady
            pendingRecipients={[]}
            initialSegment={initialSegment}
            consolidatedCustomerCount={2}
            consolidatedPaidCustomerCount={1}
            initialDispatchId="00000000-0000-4000-8000-000000000001"
          />,
        );
      });
      const message = screen.getByLabelText("Mensagem do comunicado");
      const form = message.closest("form")!;
      fireEvent.change(message, {
        target: { value: "Confira as novidades da nossa loja." },
      });
      expect(screen.queryByLabelText("Link do botão")).toBeNull();
      expect(screen.queryByLabelText("Texto do botão")).toBeNull();
      expect(screen.queryByLabelText("Texto do link alternativo")).toBeNull();
      const fields = () => new FormData(form);
      expect(fields().get("segment")).toBe(initialSegment);
      expect(fields().get("checkoutMode")).toBe("order");
      expect(fields().get("ctaUrl")).toBe("");
      expect(fields().get("campaignKind")).toBe("notice");
      expect(fields().getAll("body")).toHaveLength(1);
      expect(fields().get("body")).toContain("Confira as novidades");
      expect(fields().get("body")).not.toContain("Este link é opcional");
      const preview = screen.getByTitle(
        "Preview do e-mail",
      ) as HTMLIFrameElement;
      expect(preview.srcdoc).not.toContain("href=");
      expect(preview.srcdoc).not.toContain("PED-1234");
      expect(mocks.send).not.toHaveBeenCalled();
    },
  );

  it.each([
    "javascript:alert(1)",
    "data:text/html,test",
    "ftp://exemplo.com",
    "https://user:password@example.com",
    "{{CHECKOUT_URL}}",
    "exemplo.com",
  ])("rejeita URL insegura ou incompleta: %s", (url) => {
    expect(isValidNoticeLink(url)).toBe(false);
    expect(
      getStoreNoticeLinkValidationError(
        buildStoreNoticeLinkContent(STORE_NOTICE_PREFERENCES, {
          ...NOTICE_LINK_DEFAULTS,
          url,
        }),
      ),
    ).not.toBeNull();
  });

  it("aceita URL externa com parâmetros e preserva a validação do comunicado", () => {
    const url = "https://externo.example/campanha?origem=email&codigo=1#oferta";
    const content = buildStoreNoticeLinkContent(STORE_NOTICE_PREFERENCES, {
      ...NOTICE_LINK_DEFAULTS,
      url,
    });
    expect(getStoreNoticeLinkValidationError(content)).toBeNull();
    expect(
      isValidNoticeLink("https://www.suaempresact.site/checkout/produto"),
    ).toBe(true);
    expect(
      isValidNoticeLink("https://suaempresacto.site/pagar/v4nfdiydvd"),
    ).toBe(false);
    expect(
      isValidNoticeLink("https://www.suaempresact.site/pagar/v4nfdiydvd"),
    ).toBe(false);
    expect(
      getStoreNoticeLinkValidationError({
        ...content,
        body: content.body.replace(
          "comunicação informativa",
          "encomenda retida",
        ),
      }),
    ).not.toBeNull();
  });

  it("rejeita oferta desatualizada e notas de cobrança", () => {
    const content = buildStoreNoticeOfferContent(
      { ...STORE_NOTICE_PREFERENCES, customMessage: "Confira as novidades." },
      offer,
      OFFER_BUTTONS[0],
    );
    expect(getStoreNoticeOfferValidationError(content, offer)).toBeNull();
    expect(
      getStoreNoticeOfferValidationError(content, {
        ...offer,
        priceCents: 4999,
      }),
    ).toContain("oferta mudou");
    const deceptive = buildStoreNoticeOfferContent(
      {
        ...STORE_NOTICE_PREFERENCES,
        customMessage: "Pague uma taxa para libertar a encomenda.",
      },
      offer,
      OFFER_BUTTONS[0],
    );
    expect(getStoreNoticeOfferValidationError(deceptive, offer)).not.toBeNull();
  });
});
