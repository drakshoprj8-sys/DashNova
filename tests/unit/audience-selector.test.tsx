import * as React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AudienceSelector } from "@/features/emails/audience-selector";
import { paginateEmailAudience } from "@/features/emails/audience";
import type { Recipient } from "@/features/emails/segments";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const rows = [
  {
    id: "a",
    name: "Ana Silva",
    email: "ana@example.com",
    productName: "Cadeira Gaming",
  },
  { id: "b", name: "Bea Alves", email: "bea@example.com", productName: "JBL" },
] as Recipient[];

describe("seleção antes do disparo", () => {
  it("remove um cliente do público completo e aplica a busca à seleção quando solicitado", async () => {
    const change = vi.fn();
    const onRows = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        const params = new URL(url, "https://example.com").searchParams;
        return {
          ok: true,
          json: async () =>
            paginateEmailAudience(rows, {
              q: params.get("q") ?? "",
              from: "",
              to: "",
              page: 1,
            }),
        };
      }),
    );
    render(
      <AudienceSelector
        segment="imported_paid"
        selectedIds={null}
        onSelectionChange={change}
        onRecipients={onRows}
      />,
    );
    await screen.findByLabelText("Selecionar Ana Silva");
    fireEvent.click(screen.getByLabelText("Selecionar Ana Silva"));
    expect(change).toHaveBeenLastCalledWith(["b"]);
    fireEvent.change(
      screen.getByLabelText("Procurar por nome, email ou produto"),
      { target: { value: "gaming" } },
    );
    await waitFor(() =>
      expect(screen.queryByLabelText("Selecionar Bea Alves")).toBeNull(),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Selecionar resultados (1)" }),
    );
    expect(change).toHaveBeenLastCalledWith(["a"]);
    fireEvent.click(screen.getByRole("button", { name: "Limpar seleção" }));
    expect(change).toHaveBeenLastCalledWith([]);
    fireEvent.click(screen.getByRole("button", { name: "Todo o público" }));
    expect(change).toHaveBeenLastCalledWith(null);
  });

  it("oferece recuperação quando a lista falha, sem apresentar contatos fictícios", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false })),
    );
    render(
      <AudienceSelector
        segment="all"
        selectedIds={null}
        onSelectionChange={vi.fn()}
        onRecipients={vi.fn()}
      />,
    );
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("Não foi possível carregar"),
    );
    expect(screen.queryByLabelText("Selecionar Ana Silva")).toBeNull();
  });
});
