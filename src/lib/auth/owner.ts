/**
 * Allowlist de donos autorizados a abrir o painel.
 *
 * A `anon key` do Supabase é pública por natureza (vai no bundle do browser),
 * então qualquer pessoa pode chamar a API de cadastro do Supabase diretamente
 * e criar uma conta — mesmo com o formulário de cadastro desativado aqui.
 * Esta allowlist é a barreira final: mesmo com credenciais válidas, só os
 * e-mails listados em OWNER_EMAILS recebem sessão no painel.
 *
 * Em produção a lista é obrigatória e vazia significa acesso negado. Em
 * desenvolvimento/testes, a ausência da env continua permissiva para não
 * impedir a configuração inicial local.
 */
export function getOwnerEmails(): string[] {
  return (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isOwnerAllowlistEnabled(): boolean {
  return getOwnerEmails().length > 0;
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  const allowlist = getOwnerEmails();
  if (allowlist.length === 0) return process.env.NODE_ENV !== "production";

  return allowlist.includes((email ?? "").trim().toLowerCase());
}
