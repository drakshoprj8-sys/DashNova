interface LegacyEmailBrand {
  name: string;
  logoUrl?: string | null;
}

export const DEFAULT_CAMPAIGN_TEMPLATE = {
  subject: "PCCGVIP — informações do pedido {{PEDIDO}}",
  preheader: "Referência, artigo e valor registados no seu pedido à PCCGVIP.",
  headerName: "PCCGVIP",
  title: "Informações do pedido na PCCGVIP",
  body: "Olá {{PRIMEIRO_NOME}},\n\nSomos a equipa da PCCGVIP. Esta mensagem apresenta os dados registados no seu pedido {{PEDIDO}}.\n\nValor do pedido: {{VALOR}}.\n\nSe precisa de informações, contacte o apoio da nossa loja com a referência do pedido. Se não reconhece a PCCGVIP ou este pedido, desconsidere esta mensagem.",
  articleName: "{{PRODUTO}}",
  ctaLabel: "Ver pedido",
  ctaUrl: "{{CHECKOUT_URL}}",
  fallbackText:
    "Se o botão não funcionar, copie o endereço abaixo no navegador.",
} as const;

export const EMAIL_VARIABLES = [
  { token: "{{PRIMEIRO_NOME}}", label: "Primeiro nome" },
  { token: "{{NOME}}", label: "Nome completo" },
  { token: "{{EMAIL}}", label: "E-mail" },
  { token: "{{PRODUTO}}", label: "Produto" },
  { token: "{{PEDIDO}}", label: "Numero do pedido" },
  { token: "{{VALOR}}", label: "Valor do pedido" },
  { token: "{{STATUS}}", label: "Estado do pedido" },
  { token: "{{CHECKOUT_URL}}", label: "Link do pedido" },
  { token: "{{LOJA_URL}}", label: "Endereco da loja" },
] as const;

export interface CampaignTemplateVars {
  nome: string;
  primeiroNome: string;
  email: string;
  produto: string;
  pedido: string;
  valor: string;
  checkoutUrl: string;
  lojaUrl: string;
  /** Estado real do pedido verificado (rótulo pt), preenchido pelo servidor. */
  status?: string;
}

export interface CampaignTemplateContent {
  body: string;
  headerName?: string;
  title?: string;
  articleName?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  fallbackText?: string;
}

const VARIABLE_ALIASES: Record<string, keyof CampaignTemplateVars> = {
  NOME: "nome",
  NOME_CLIENTE: "nome",
  PRIMEIRO_NOME: "primeiroNome",
  EMAIL: "email",
  PRODUTO: "produto",
  PEDIDO: "pedido",
  VALOR: "valor",
  CHECKOUT_URL: "checkoutUrl",
  LOJA_URL: "lojaUrl",
  nome: "primeiroNome",
  email: "email",
  produto: "produto",
  pedido: "pedido",
  valor: "valor",
  checkout_url: "checkoutUrl",
  STATUS: "status",
  ESTADO: "status",
  status: "status",
  estado: "status",
};

const VARIABLE_PATTERN = /\{\{\s*([A-Za-z_]+)\s*\}\}/g;
export function renderCampaignText(
  template: string,
  vars: CampaignTemplateVars,
): string {
  return template
    .replace(VARIABLE_PATTERN, (match, token: string) => {
      const key = VARIABLE_ALIASES[token];
      return key ? (vars[key] ?? "") : "";
    })
    .replace(/[ \t]+([,.;:!?])/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function validHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isValidCtaUrlTemplate(value: string): boolean {
  const sampleVars: CampaignTemplateVars = {
    nome: "Cliente Exemplo",
    primeiroNome: "Cliente",
    email: "cliente@example.com",
    produto: "Produto",
    pedido: "PED-1234",
    valor: "49,90 EUR",
    checkoutUrl: "https://example.com/checkout/PED-1234",
    lojaUrl: "https://example.com",
  };
  return validHttpUrl(renderCampaignText(value, sampleVars));
}

export function buildCampaignHtml(input: {
  body: string;
  preheader?: string;
  headerName?: string;
  title?: string;
  articleName?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  fallbackText?: string;
  vars: CampaignTemplateVars;
  /** A marca visual de campanhas antigas é ignorada intencionalmente. */
  brand?: LegacyEmailBrand;
}): string {
  const renderedBody = renderCampaignText(input.body, input.vars);
  const paragraphs = escapeHtml(renderedBody)
    .split(/\n{2,}/)
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 18px;line-height:1.65">${paragraph.replace(/\n/g, "<br>")}</p>`,
    )
    .join("");
  const preheader = input.preheader
    ? renderCampaignText(input.preheader, input.vars)
    : "";
  const headerName = input.headerName
    ? renderCampaignText(input.headerName, input.vars)
    : "";
  const title = renderCampaignText(
    input.title ?? DEFAULT_CAMPAIGN_TEMPLATE.title,
    input.vars,
  );
  const articleName = renderCampaignText(
    input.articleName ?? DEFAULT_CAMPAIGN_TEMPLATE.articleName,
    input.vars,
  );
  const ctaLabel = renderCampaignText(
    input.ctaLabel ?? DEFAULT_CAMPAIGN_TEMPLATE.ctaLabel,
    input.vars,
  );
  const ctaUrl = renderCampaignText(
    input.ctaUrl ?? DEFAULT_CAMPAIGN_TEMPLATE.ctaUrl,
    input.vars,
  );
  const fallbackText = renderCampaignText(
    input.fallbackText ?? DEFAULT_CAMPAIGN_TEMPLATE.fallbackText,
    input.vars,
  );
  const hasCtaUrl = validHttpUrl(ctaUrl);
  const hasOrder = Boolean(
    input.vars.pedido.trim() && input.vars.pedido !== "o seu pedido",
  );
  const hasProduct = Boolean(
    input.vars.produto.trim() && input.vars.produto !== "o seu produto",
  );
  const status = (input.vars.status ?? "").trim();
  const checkoutButton = hasCtaUrl
    ? `<p style="margin:28px 0 16px;line-height:1.65">Use o botão abaixo para continuar:</p>
<div style="margin:0 0 20px;text-align:center"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#cc0000;color:#ffffff;text-decoration:none;padding:15px 34px;border-radius:8px;font-weight:700;font-size:15px">${escapeHtml(ctaLabel)}</a></div>
<p style="margin:0 0 26px;line-height:1.55;color:#6b7280;font-size:12px">${escapeHtml(fallbackText)}<br><a href="${escapeHtml(ctaUrl)}" style="color:#cc0000;word-break:break-all">${escapeHtml(ctaUrl)}</a></p>`
    : "";
  return `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3f4f6;padding:28px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,Helvetica,sans-serif;color:#111827;font-size:15px;line-height:1.65">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}${"&#8199;&#65279;&#847; ".repeat(24)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border-top:4px solid #cc0000;box-shadow:0 1px 4px rgba(17,24,39,.08)"><tr><td>
<div style="padding:34px 34px 30px">
${headerName ? `<p style="margin:0 0 6px;font-size:19px;font-weight:700;line-height:1.3;letter-spacing:-.01em;color:#cc0000">${escapeHtml(headerName)}</p>` : ""}
<h1 style="margin:0 0 ${status ? "16px" : "22px"};font-size:22px;font-weight:700;line-height:1.3;color:#111827">${escapeHtml(title)}</h1>
${status ? `<p style="margin:0 0 22px"><span style="display:inline-block;background:#fdecec;color:#cc0000;font-size:12px;font-weight:700;letter-spacing:.02em;padding:6px 13px;border-radius:999px">Estado: ${escapeHtml(status)}</span></p>` : ""}
${paragraphs}
${
  hasOrder || hasProduct
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:10px 0 26px;background:#f7f8fa;border:1px solid #eceef1;border-radius:12px"><tr><td style="padding:20px 24px;font-size:14px;line-height:1.75;color:#111827">
${hasOrder ? `<strong>Encomenda:</strong> ${escapeHtml(input.vars.pedido)}` : ""}${hasProduct ? `${hasOrder ? "<br>" : ""}<strong>Artigo:</strong> ${escapeHtml(articleName)}` : ""}
</td></tr></table>`
    : ""
}
${checkoutButton}
<p style="margin:0;line-height:1.65;color:#374151">Se tiver dúvidas, contacte o apoio da PCCGVIP.</p>
</div>
<div style="border-top:1px solid #e5e7eb;padding:20px 34px;text-align:left">
<p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280">Mensagem da PCCGVIP.<br>Para deixar de receber, contacte o apoio da nossa loja.</p>
</div>
</td></tr></table></body></html>`;
}
