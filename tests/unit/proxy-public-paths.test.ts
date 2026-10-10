import { describe, expect, it } from "vitest";

import { isPublicPath } from "@/proxy";

/**
 * Rotas de webhook precisam ficar fora da proteção de sessão: quem chama
 * é um servidor externo (Broski), que não tem cookie de login. A garantia
 * de autenticidade é a assinatura HMAC verificada dentro da rota.
 */
describe("isPublicPath", () => {
  it("libera o webhook do Broski", () => {
    expect(isPublicPath("/api/webhooks/broski")).toBe(true);
  });

  it("libera a sincronização agendada, que valida CRON_SECRET na rota", () => {
    expect(isPublicPath("/api/cron/milluni-customers")).toBe(true);
  });

  it("libera páginas públicas da loja", () => {
    expect(isPublicPath("/p/produto-exemplo")).toBe(true);
    expect(isPublicPath("/checkout/checkout-exemplo")).toBe(true);
    expect(isPublicPath("/obrigado")).toBe(true);
    expect(isPublicPath("/acompanhar/token-assinado")).toBe(true);
    expect(isPublicPath("/legal/termos")).toBe(true);
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/auth/confirm")).toBe(true);
    expect(isPublicPath("/redefinir-senha")).toBe(true);
  });

  it("mantém o painel protegido", () => {
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/pedidos")).toBe(false);
    expect(isPublicPath("/financeiro/repasses")).toBe(false);
    expect(isPublicPath("/")).toBe(false);
  });

  it("não libera rotas de API que não são webhooks", () => {
    expect(isPublicPath("/api/diagnostico")).toBe(false);
  });

  it("não confunde prefixos parecidos com rotas públicas", () => {
    expect(isPublicPath("/login-falso")).toBe(false);
    expect(isPublicPath("/authentic")).toBe(false);
    expect(isPublicPath("/api/publicity")).toBe(false);
    expect(isPublicPath("/api/webhooks-malicioso")).toBe(false);
    expect(isPublicPath("/pay/falso")).toBe(false);
    expect(isPublicPath("/loja")).toBe(false);
    expect(isPublicPath("/loja-admin")).toBe(false);
  });
});
