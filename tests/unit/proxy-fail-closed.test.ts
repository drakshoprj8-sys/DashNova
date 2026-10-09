import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: mocks.createServerClient,
}));

import { proxy } from "@/proxy";

const ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "ALLOW_DEMO_MODE",
  "OWNER_EMAILS",
] as const;

const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
  mocks.createServerClient.mockReset();
});

function configureSupabaseUser(email: string): void {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  mocks.createServerClient.mockReturnValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1", email } },
        error: null,
      }),
    },
  });
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe("proxy sem Supabase configurado", () => {
  it("redireciona rota protegida para o login por padrão", async () => {
    const response = await proxy(
      new NextRequest("https://dashboard.vercel.app/dashboard"),
    );

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirect")).toBe("/dashboard");
  });

  it("mantém as páginas públicas acessíveis", async () => {
    const response = await proxy(
      new NextRequest("https://dashboard.vercel.app/login"),
    );

    expect(response.status).toBe(200);
  });

  it("só abre rota protegida sem sessão quando o demo foi habilitado", async () => {
    process.env.ALLOW_DEMO_MODE = "true";

    const response = await proxy(
      new NextRequest("https://dashboard.vercel.app/dashboard"),
    );

    expect(response.status).toBe(200);
  });

  it("não aceita valores aproximados para habilitar o demo", async () => {
    process.env.ALLOW_DEMO_MODE = "1";

    const response = await proxy(
      new NextRequest("https://dashboard.vercel.app/dashboard"),
    );

    expect(response.status).toBe(307);
  });
});

describe("proxy com sessão Supabase", () => {
  it("bloqueia uma conta autenticada fora de OWNER_EMAILS", async () => {
    process.env.OWNER_EMAILS = "dono@exemplo.com";
    configureSupabaseUser("intruso@exemplo.com");

    const response = await proxy(
      new NextRequest("https://dashboard.vercel.app/api/dashboard"),
    );

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("redirect")).toBe("/api/dashboard");
  });

  it("permite a conta listada e a retira das páginas de login", async () => {
    process.env.OWNER_EMAILS = "dono@exemplo.com";
    configureSupabaseUser("dono@exemplo.com");

    const response = await proxy(
      new NextRequest("https://dashboard.vercel.app/login"),
    );

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe(
      "/dashboard",
    );
  });
});
