import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
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

describe("checkout abaixo do comunicado", () => {
  it.each(["all", "paid"] as const)(
    "mantém o público %s e a mensagem ao preencher o checkout",
    async (initialSegment) => {
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
      const message = screen.getByLabelText("Mensagem do comunicado");
      const link = screen.getByLabelText("Link do botão");
      expect(
        message.compareDocumentPosition(link) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      const form = link.closest("form")!;
      fireEvent.change(message, {
        target: { value: "Confira as novidades da nossa loja." },
      });
      const chosenUrl =
        "https://externo.example/novidades?origem=email&campanha=outubro";
      fireEvent.change(screen.getByLabelText("Texto do botão"), {
        target: { value: "Continuar para o Pagamento" },
      });
      fireEvent.change(link, { target: { value: chosenUrl } });
      const fields = () => new FormData(form);
      expect(fields().get("segment")).toBe(initialSegment);
      expect(fields().get("checkoutMode")).toBe("order");
      expect(
        (
          screen.getByRole("button", {
            name: /Enviar para/,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
      await waitFor(() => expect(fields().get("ctaUrl")).toBe(chosenUrl));
      expect(fields().get("campaignKind")).toBe("notice-link");
      expect(fields().get("ctaLabel")).toBe("Continuar para o Pagamento");
      expect(fields().getAll("body")).toHaveLength(1);
      expect(fields().get("body")).toContain("Confira as novidades");
      expect(fields().get("body")).toContain("Este link é opcional");
      const preview = screen.getByTitle(
        "Preview do e-mail",
      ) as HTMLIFrameElement;
      expect(preview.srcdoc).toContain(
        `href="${chosenUrl.replace(/&/g, "&amp;")}"`,
      );
      expect(preview.srcdoc).toContain("background:#cc0000");
      expect(preview.srcdoc).toContain("Continuar para o Pagamento");
      expect(preview.srcdoc).not.toContain("PED-1234");
      expect(
        (
          screen.getByRole("button", {
            name: /Enviar para/,
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(false);
      // Removing the URL also removes the offer and keeps the notice sendable.
      fireEvent.change(link, { target: { value: "" } });
      expect(fields().get("campaignKind")).toBe("notice");
      expect(fields().get("ctaUrl")).toBe("");
      expect(
        (screen.getByTitle("Preview do e-mail") as HTMLIFrameElement).srcdoc,
      ).not.toContain("href=");
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
