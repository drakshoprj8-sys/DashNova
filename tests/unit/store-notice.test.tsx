import * as React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StoreNoticeEditor } from "@/features/emails/store-notice-editor";
import {
  STORE_NOTICE_PREFERENCES,
  buildStoreNoticeContent,
  buildStoreNoticeHtml,
  getStoreNoticeValidationError,
} from "@/features/emails/store-notice";

afterEach(cleanup);

describe("comunicado informativo para todos", () => {
  it("aceita personalização de nome sem inventar um pedido", () => {
    const content = buildStoreNoticeContent({
      ...STORE_NOTICE_PREFERENCES,
      customMessage:
        "{{NOME}}, a equipa está disponível para esclarecer as suas dúvidas.",
    });
    expect(getStoreNoticeValidationError(content)).toBeNull();
    expect(
      getStoreNoticeValidationError({
        ...content,
        body: content.body.replace(/\n/g, "\r\n"),
      }),
    ).toBeNull();
    const html = buildStoreNoticeHtml({
      ...content,
      vars: {
        nome: "Maria Oliveira",
        primeiroNome: "Maria",
        email: "maria@example.com",
        pedido: "PED-99",
        produto: "Produto",
        valor: "99 EUR",
        checkoutUrl: "https://example.com/pagar/99",
        lojaUrl: "https://example.com",
      },
    });
    expect(html).toContain("Maria Oliveira");
    expect(html).not.toContain("href=");
    expect(html).not.toContain("PED-99");
    expect(html).not.toContain("Encomenda:");
  });

  it.each([
    "Pague uma taxa para libertar a encomenda.",
    "A encomenda está retida no centro de distribuição.",
    "Visite https://example.com/pagar",
    "Somos dos Correios de Portugal.",
    "Confira {{CHECKOUT_URL}}",
    "O seu pedido é {{PEDIDO}}",
  ])(
    "rejeita conteúdo de cobrança, terceiros ou pedidos: %s",
    (customMessage) => {
      expect(
        getStoreNoticeValidationError(
          buildStoreNoticeContent({
            ...STORE_NOTICE_PREFERENCES,
            customMessage,
          }),
        ),
      ).not.toBeNull();
    },
  );

  it("rejeita URL ou modo checkout mesmo com uma mensagem informativa", () => {
    const content = buildStoreNoticeContent(STORE_NOTICE_PREFERENCES);
    expect(
      getStoreNoticeValidationError({ ...content, ctaUrl: "{{CHECKOUT_URL}}" }),
    ).not.toBeNull();
    expect(
      getStoreNoticeValidationError({ ...content, checkoutMode: "checkout" }),
    ).not.toBeNull();
    expect(
      getStoreNoticeValidationError({ ...content, headerName: "CTT PCCGVIP" }),
    ).not.toBeNull();
  });

  it.each(["all", "paid"] as const)("exibe um editor de %s sem checkout e envia o corpo correto no formulário", (audience) => {
    function Harness() {
      const [value, setValue] = React.useState({ ...STORE_NOTICE_PREFERENCES });
      return (
        <form aria-label="Comunicado">
          <StoreNoticeEditor audience={audience} value={value} onChange={setValue} />
        </form>
      );
    }
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Mensagem do comunicado"), {
      target: { value: "Obrigado por acompanhar as novidades da nossa loja." },
    });
    expect(screen.queryByLabelText("Link do botão (checkout)")).toBeNull();
    const fields = new FormData(
      screen.getByRole("form", { name: "Comunicado" }) as HTMLFormElement,
    );
    expect(fields.get("ctaUrl")).toBe("");
    expect(fields.getAll("body")).toHaveLength(1);
    expect(
      getStoreNoticeValidationError(Object.fromEntries(fields)),
    ).toBeNull();
  });
});
