import * as React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NotificationEditor } from "@/features/emails/notification-editor";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_OPTIONS,
} from "@/features/emails/notification-content";
import { isCanonicalOrderNotification } from "@/features/emails/notification-policy";

afterEach(cleanup);

function Harness() {
  const [value, setValue] = React.useState({
    ...DEFAULT_NOTIFICATION_PREFERENCES,
  });
  return (
    <form aria-label="Editor">
      <NotificationEditor value={value} onChange={setValue} />
    </form>
  );
}

describe("notification editor", () => {
  it("updates the live message and submits one composed body", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Assunto"), {
      target: { value: NOTIFICATION_OPTIONS.subject[1] },
    });
    fireEvent.change(screen.getByLabelText("Nome no cabeçalho"), {
      target: { value: "Equipa de apoio PCCGVIP" },
    });
    fireEvent.change(screen.getByLabelText("Texto do botão"), {
      target: { value: "Acompanhar encomenda" },
    });
    fireEvent.change(screen.getByLabelText("Saudação"), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByLabelText("Despedida"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByLabelText("Mostrar o valor do pedido"));
    fireEvent.change(screen.getByLabelText("Mensagem"), {
      target: { value: "O acompanhamento está disponível no apoio da loja." },
    });
    const fields = new FormData(
      screen.getByRole("form", { name: "Editor" }) as HTMLFormElement,
    );
    const body = String(fields.get("body"));
    expect(body).toContain("Olá {{NOME}},");
    expect(body).toContain("O acompanhamento está disponível no apoio da loja.");
    expect(body).toContain("Obrigado,\nEquipa PCCGVIP");
    expect(body).not.toContain("Valor do pedido:");
    expect(fields.get("headerName")).toBe("Equipa de apoio PCCGVIP");
    expect(fields.get("ctaLabel")).toBe("Acompanhar encomenda");
    expect(fields.get("ctaUrl")).toBe("{{CHECKOUT_URL}}");
    expect(
      isCanonicalOrderNotification(Object.fromEntries(fields.entries())),
    ).toBe(true);
    expect(fields.getAll("body")).toHaveLength(1);
    expect(fields.getAll("subject")).toHaveLength(1);
  });

  it("restores the original message and the displayed order value", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Texto do pedido"), {
      target: { value: "2" },
    });
    fireEvent.click(screen.getByLabelText("Mostrar o valor do pedido"));
    fireEvent.change(screen.getByLabelText("Mensagem"), {
      target: { value: "Nota do pedido." },
    });
    fireEvent.change(screen.getByLabelText("Texto do botão"), {
      target: { value: "Ver encomenda" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Restaurar padrão" }));
    expect(
      (screen.getByLabelText("Mensagem") as HTMLTextAreaElement).value,
    ).toBe("");
    expect(
      (screen.getByLabelText("Mostrar o valor do pedido") as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect((screen.getByLabelText("Texto do botão") as HTMLInputElement).value).toBe("Ver pedido");
  });

  it("mostra o motivo específico quando o assunto não identifica a loja", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Assunto"), { target: { value: "Outro assunto" } });
    expect(screen.getByRole("alert").textContent).toContain("Assunto:");
  });

  it("envia o texto alternativo editado uma vez e preserva a validação", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Texto do link alternativo"), {
      target: { value: "Se precisar, copie o endereço do pedido abaixo." },
    });
    const fields = new FormData(screen.getByRole("form", { name: "Editor" }) as HTMLFormElement);
    expect(fields.getAll("fallbackText")).toEqual(["Se precisar, copie o endereço do pedido abaixo."]);
    expect(isCanonicalOrderNotification(Object.fromEntries(fields.entries()))).toBe(true);
    fireEvent.change(screen.getByLabelText("Texto do link alternativo"), {
      target: { value: "Pague em https://example.com" },
    });
    expect(screen.getByRole("alert").textContent).toContain("Texto do link alternativo:");
  });

  it("explica quando o destino é o checkout de um pedido pendente", () => {
    function PendingHarness() {
      const [requestedCheckoutUrl, setRequestedCheckoutUrl] = React.useState("");
      return <form aria-label="Checkout pendente"><NotificationEditor
        value={{ ...DEFAULT_NOTIFICATION_PREFERENCES, ctaLabel: "Abrir checkout do pedido" }}
        onChange={() => {}}
        destinationKind="checkout"
        previewCheckoutUrl="https://www.suaempresacto.site/pagar/exemplo123"
        requestedCheckoutUrl={requestedCheckoutUrl}
        onRequestedCheckoutUrlChange={setRequestedCheckoutUrl}
      /></form>;
    }
    render(<PendingHarness />);
    const link = screen.getByLabelText("Link do botão (checkout)") as HTMLInputElement;
    expect(link.readOnly).toBe(false);
    fireEvent.change(link, { target: { value: "https://www.suaempresacto.site/pagar/exemplo123" } });
    expect(link.value).toContain("/pagar/exemplo123");
    const fields = new FormData(screen.getByRole("form", { name: "Checkout pendente" }) as HTMLFormElement);
    expect(fields.get("ctaUrl")).toBe("https://www.suaempresacto.site/pagar/exemplo123");
    expect(screen.getByText(/checkout publicado/)).toBeTruthy();
  });

  it("permite substituir o marcador de pedido pago por uma URL e ativar checkout", () => {
    function OrderHarness() {
      const [url, setUrl] = React.useState("");
      const [kind, setKind] = React.useState<"order" | "checkout">("order");
      return <form aria-label="Link editável"><NotificationEditor
        value={DEFAULT_NOTIFICATION_PREFERENCES}
        onChange={() => {}}
        destinationKind={kind}
        requestedCheckoutUrl={url}
        onRequestedCheckoutUrlChange={(next) => { setUrl(next); setKind("checkout"); }}
      /></form>;
    }
    render(<OrderHarness />);
    const link = screen.getByLabelText("Link individual do pedido") as HTMLInputElement;
    expect(link.readOnly).toBe(false);
    expect(link.value).toBe("{{CHECKOUT_URL}}");
    fireEvent.change(link, { target: { value: "https://suaempresacto.site/pagar/exemplo123" } });
    expect((screen.getByLabelText("Link do botão (checkout)") as HTMLInputElement).value).toBe("https://suaempresacto.site/pagar/exemplo123");
    const fields = new FormData(screen.getByRole("form", { name: "Link editável" }) as HTMLFormElement);
    expect(fields.get("ctaUrl")).toBe("https://suaempresacto.site/pagar/exemplo123");
  });
});
