import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    domains = { list: mocks.list };
    emails = { send: mocks.send };
  },
}));

import { testResendConnection } from "@/features/emails/resend-provider";

describe("verificação de conexão sem disparo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "PCCGVIP <notificacoes@encomendapgcvip.site>");
  });

  it("valida a chave e o domínio do remetente sem enviar e-mail", async () => {
    mocks.list.mockResolvedValue({ data: { data: [{ name: "encomendapgcvip.site", status: "verified" }] }, error: null });
    const result = await testResendConnection();
    expect(result).toMatchObject({ ok: true });
    expect(result.message).toContain("encomendapgcvip.site verificado");
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it.each(["pending", "failed", "not_started"])("não confunde chave válida com domínio %s", async (status) => {
    mocks.list.mockResolvedValue({ data: { data: [{ name: "encomendapgcvip.site", status }] }, error: null });
    expect((await testResendConnection()).ok).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejeita domínio de outra conta ou outro remetente", async () => {
    mocks.list.mockResolvedValue({ data: { data: [{ name: "example.com", status: "verified" }] }, error: null });
    expect((await testResendConnection()).ok).toBe(false);
  });

  it("mostra a falha da API sem declarar conexão validada", async () => {
    mocks.list.mockResolvedValue({ data: null, error: { message: "API key is invalid" } });
    expect(await testResendConnection()).toEqual({ ok: false, message: "API key is invalid" });
  });

  it("não consulta o provedor sem configuração", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    expect((await testResendConnection()).ok).toBe(false);
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
