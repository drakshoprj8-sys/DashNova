import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("@/lib/supabase/config", () => ({
  isSupabaseConfigured: mocks.isSupabaseConfigured,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

import { GET } from "@/app/auth/confirm/route";
import {
  forgotPasswordAction,
  loginAction,
  resetPasswordAction,
} from "@/features/auth/actions";

function passwordForm(
  password = "senha-segura-123",
  confirmPassword = password,
): FormData {
  const formData = new FormData();
  formData.set("password", password);
  formData.set("confirmPassword", confirmPassword);
  return formData;
}

beforeEach(() => {
  mocks.createClient.mockReset();
  mocks.isSupabaseConfigured.mockReset();
  mocks.isSupabaseConfigured.mockReturnValue(true);
  mocks.redirect.mockReset();
  mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  });
  process.env.OWNER_EMAILS = "dono@exemplo.com";
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
  delete process.env.OWNER_EMAILS;
});

describe("callback PKCE de recuperação", () => {
  it("troca o código por sessão e redireciona sem o código", async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      auth: { exchangeCodeForSession },
    });

    const response = await GET(
      new NextRequest(
        "https://dashboard.vercel.app/auth/confirm?code=uso-unico&next=/redefinir-senha",
      ),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("uso-unico");
    expect(response.headers.get("location")).toBe(
      "https://dashboard.vercel.app/redefinir-senha",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("não aceita destino externo no parâmetro next", async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
      },
    });

    const response = await GET(
      new NextRequest(
        "https://dashboard.vercel.app/auth/confirm?code=uso-unico&next=//evil.example",
      ),
    );

    expect(response.headers.get("location")).toBe(
      "https://dashboard.vercel.app/redefinir-senha",
    );
  });

  it("marca links ausentes ou recusados como inválidos", async () => {
    const noCode = await GET(
      new NextRequest("https://dashboard.vercel.app/auth/confirm"),
    );
    expect(noCode.headers.get("location")).toContain(
      "/redefinir-senha?error=link-invalido",
    );

    mocks.createClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi
          .fn()
          .mockResolvedValue({ error: { code: "flow_state_not_found" } }),
      },
    });
    const refused = await GET(
      new NextRequest(
        "https://dashboard.vercel.app/auth/confirm?code=expirado",
      ),
    );
    expect(refused.headers.get("location")).toContain(
      "/redefinir-senha?error=link-invalido",
    );
  });

  it("falha de forma explícita quando o Supabase não está configurado", async () => {
    mocks.isSupabaseConfigured.mockReturnValue(false);

    const response = await GET(
      new NextRequest(
        "https://dashboard.vercel.app/auth/confirm?code=uso-unico",
      ),
    );

    expect(response.headers.get("location")).toContain(
      "/redefinir-senha?error=configuracao",
    );
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});

describe("início do fluxo de recuperação", () => {
  it("envia o e-mail para o callback PKCE", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://dashboard.example";
    const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      auth: { resetPasswordForEmail },
    });
    const formData = new FormData();
    formData.set("email", "dono@exemplo.com");

    const result = await forgotPasswordAction(null, formData);

    expect(result.ok).toBe(true);
    expect(resetPasswordForEmail).toHaveBeenCalledWith("dono@exemplo.com", {
      redirectTo:
        "https://dashboard.example/auth/confirm?next=/redefinir-senha",
    });
  });
});

describe("loginAction", () => {
  it("substitui um redirect externo pelo dashboard", async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
        signOut: vi.fn(),
      },
    });
    const formData = new FormData();
    formData.set("email", "dono@exemplo.com");
    formData.set("password", "senha-segura-123");
    formData.set("redirect", "//evil.example/roubar");

    await expect(loginAction(null, formData)).rejects.toThrow(
      "NEXT_REDIRECT:/dashboard",
    );
    expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
  });
});

describe("resetPasswordAction", () => {
  it("valida tamanho e confirmação antes de chamar o Supabase", async () => {
    const short = await resetPasswordAction(null, passwordForm("curta"));
    const mismatch = await resetPasswordAction(
      null,
      passwordForm("senha-segura-123", "outra-senha-123"),
    );

    expect(short.error).toBe("A senha deve ter pelo menos 8 caracteres");
    expect(mismatch.error).toBe("As senhas não coincidem");
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("recusa sessão ausente ou expirada", async () => {
    const updateUser = vi.fn();
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { code: "session_not_found" },
        }),
        updateUser,
      },
    });

    const result = await resetPasswordAction(null, passwordForm());

    expect(result.ok).toBe(false);
    expect(result.error).toContain("inválido ou expirou");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("atualiza a senha, encerra a sessão recovery e volta ao login", async () => {
    const updateUser = vi.fn().mockResolvedValue({ error: null });
    const signOut = vi.fn().mockResolvedValue({ error: null });
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "dono@exemplo.com" } },
          error: null,
        }),
        updateUser,
        signOut,
      },
    });

    await expect(resetPasswordAction(null, passwordForm())).rejects.toThrow(
      "NEXT_REDIRECT:/login?passwordReset=success",
    );

    expect(updateUser).toHaveBeenCalledWith({
      password: "senha-segura-123",
    });
    expect(signOut).toHaveBeenCalledOnce();
    expect(mocks.redirect).toHaveBeenCalledWith("/login?passwordReset=success");
  });
});
