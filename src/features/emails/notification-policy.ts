import { DEFAULT_CAMPAIGN_TEMPLATE } from "./template";
import {
  MESSAGE_OPTIONS,
  SUPPORTED_NOTIFICATION_BODIES,
} from "./notification-content";
import { checkoutPath } from "./checkout-url-constraint";

const CUSTOM_MESSAGE_LIMIT = 800;
const disallowedCustomText =
  /https?:\/\/|www\.|(?:[\w-]+\.)+(?:com|pt|site|net|org)\b|\{\{\s*(?:CHECKOUT_URL|LOJA_URL)\s*\}\}|\b(?:pagamento|pagar|pague|cobrança|taxa|retid[ao]|bloquead[ao]|suspens[ao]|libertar)\b/i;

function isSupportedBody(body: string): boolean {
  if (SUPPORTED_NOTIFICATION_BODIES.has(body)) return true;
  for (const canonical of SUPPORTED_NOTIFICATION_BODIES) {
    for (const option of MESSAGE_OPTIONS.support) {
      const marker = `\n\n${option.value} Se não reconhece a PCCGVIP`;
      const insertAt = canonical.indexOf(marker);
      if (insertAt < 0) continue;
      const prefix = `${canonical.slice(0, insertAt)}\n\n`;
      const suffix = canonical.slice(insertAt);
      if (!body.startsWith(prefix) || !body.endsWith(suffix)) continue;
      const custom = body.slice(prefix.length, body.length - suffix.length);
      if (
        custom.length > 0 &&
        custom.length <= CUSTOM_MESSAGE_LIMIT &&
        custom === custom.trim() &&
        !disallowedCustomText.test(custom)
      ) {
        return true;
      }
    }
  }
  return false;
}

/** Mensagem exibida junto ao campo inválido, mantendo a mesma validação no servidor. */
export function getOrderNotificationValidationError(
  content: Record<string, unknown>,
  pendingCheckout = false,
): string | null {
  for (const [field, value] of Object.entries(DEFAULT_CAMPAIGN_TEMPLATE)) {
    const received = content[field] ?? "";
    // Multipart forms serialize LF as CRLF, including hidden input values.
    // Normalizar apenas a quebra de linha do transporte multipart.
    if (typeof received !== "string") return `Campo ${field} inválido.`;
    const normalized = received.replace(/\r\n/g, "\n");
    if (field === "body") {
      if (!isSupportedBody(normalized)) return "Mensagem: mantenha os dados reais do pedido e retire links, pedidos de pagamento ou afirmações de retenção.";
      continue;
    }
    if (field === "subject" || field === "preheader" || field === "title") {
      const limit = field === "preheader" ? 180 : 160;
      const valid = normalized.length >= (field === "preheader" ? 0 : 3) &&
        normalized.length <= limit &&
        (field !== "subject" || /PCCGVIP/i.test(normalized)) &&
        !/[\r\n<>@]/.test(normalized) &&
        !disallowedCustomText.test(normalized);
      if (!valid) return field === "subject"
        ? "Assunto: escreva um título de 3 a 160 caracteres que identifique a PCCGVIP, sem links ou cobranças."
        : field === "preheader"
          ? "Texto de pré-visualização: retire links, cobranças ou caracteres inválidos."
          : "Título interno: escreva de 3 a 160 caracteres sem links ou cobranças.";
      continue;
    }
    if (field === "headerName") {
      const valid = normalized.length > 0 && normalized.length <= 80 &&
        /PCCGVIP/i.test(normalized) &&
        !/[\r\n<>@]/.test(normalized) &&
        !/https?:|www\.|(?:[\w-]+\.)+(?:com|pt|site|net|org)\b/i.test(normalized);
      if (!valid) return "Nome no cabeçalho: escolha um nome de até 80 caracteres que identifique a PCCGVIP, sem links.";
      continue;
    }
    if (field === "ctaLabel") {
      if (normalized.length < 2 || normalized.length > 60 || normalized !== normalized.trim() ||
        !/^[\p{L}\p{N} .,!?—-]+$/u.test(normalized) ||
        !/(?:pedido|encomenda|compra)/i.test(normalized) ||
        disallowedCustomText.test(normalized)) {
        return "Texto do botão: use até 60 caracteres sobre ver ou acompanhar o pedido, sem cobranças ou links.";
      }
      continue;
    }
    if (field === "fallbackText") {
      if (normalized.length > 240 || /[<>]/.test(normalized) || disallowedCustomText.test(normalized)) {
        return "Texto do link alternativo: use até 240 caracteres, sem links ou cobranças.";
      }
      continue;
    }
    if (field === "ctaUrl" && pendingCheckout && normalized !== value && checkoutPath(normalized)) continue;
    if (normalized !== value) return field === "ctaUrl"
      ? "Link do botão: use um endereço HTTPS de /pagar/ ou /checkout/ sem parâmetros. Ele precisa corresponder ao pedido pendente."
      : `Campo ${field} inválido.`;
  }
  return null;
}

/** Aceita uma nota livre dentro da mensagem identificada da loja, sem links ou cobranças. */
export function isCanonicalOrderNotification(content: Record<string, unknown>, pendingCheckout = false): boolean {
  return getOrderNotificationValidationError(content, pendingCheckout) === null;
}
