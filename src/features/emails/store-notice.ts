import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  buildNotificationContent,
  type NotificationPreferences,
} from "./notification-content";
import { getOrderNotificationValidationError } from "./notification-policy";
import { buildCampaignHtml, DEFAULT_CAMPAIGN_TEMPLATE } from "./template";
import type { SegmentKey } from "./types";

export function isStoreNoticeSegment(segment: SegmentKey): boolean {
  return segment === "all" || segment === "paid";
}

export const STORE_NOTICE_KIND = "pccgvip-store-notice-v1";
export const STORE_NOTICE_PREFERENCES: NotificationPreferences = {
  ...DEFAULT_NOTIFICATION_PREFERENCES,
  subject: "PCCGVIP — comunicado da nossa loja",
  preheader: "Uma mensagem da equipa PCCGVIP para os nossos clientes.",
  title: "Comunicado da PCCGVIP",
  showValue: false,
  fallbackText: "",
};
const opening =
  "Olá {{PRIMEIRO_NOME}},\n\nSomos a equipa da PCCGVIP. Esta é uma comunicação informativa da nossa loja.";
const closing =
  "Se tiver dúvidas, contacte o apoio da PCCGVIP. Se não reconhece a nossa loja, desconsidere esta mensagem.";

export function buildStoreNoticeContent(preferences: NotificationPreferences) {
  return {
    ...DEFAULT_CAMPAIGN_TEMPLATE,
    subject: preferences.subject,
    preheader: preferences.preheader,
    headerName: preferences.headerName,
    title: preferences.title,
    body: [opening, preferences.customMessage.trim(), closing]
      .filter(Boolean)
      .join("\n\n"),
    ctaUrl: "",
    fallbackText: "",
  };
}

/** Validates the informational mode independently of order/checkout campaigns. */
export function getStoreNoticeValidationError(
  content: Record<string, unknown>,
): string | null {
  if (
    content.ctaUrl !== "" ||
    content.fallbackText !== "" ||
    content.checkoutMode === "checkout"
  ) {
    return "Comunicados da loja não incluem checkout ou cobrança.";
  }
  const body =
    typeof content.body === "string" ? content.body.replace(/\r\n/g, "\n") : "";
  const prefix = `${opening}\n\n`;
  const suffix = `\n\n${closing}`;
  let note = "";
  if (body !== `${opening}\n\n${closing}`) {
    if (!body.startsWith(prefix) || !body.endsWith(suffix))
      return "Mantenha a identificação da PCCGVIP no comunicado.";
    note = body.slice(prefix.length, -suffix.length);
    if (!note || note !== note.trim())
      return "Escreva uma mensagem informativa válida.";
  }
  // Reuse the existing store identity and no-payment/no-link validation.
  const noteError = getOrderNotificationValidationError(
    buildNotificationContent({
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      customMessage: note,
    }),
  );
  if (noteError)
    return "Mensagem: use informações da loja, sem links, cobranças ou alegações de retenção.";
  const visibleText = [
    content.subject,
    content.preheader,
    content.headerName,
    content.title,
    note,
  ].join("\n");
  if (
    /\b(?:correios|ctt)\b|\{\{\s*(?!PRIMEIRO_NOME\s*\}\}|NOME\s*\}\}|EMAIL\s*\}\})[^}]*\}\}/i.test(
      visibleText,
    )
  ) {
    return "Use a identidade da PCCGVIP e apenas as variáveis de nome e e-mail neste comunicado.";
  }
  return getOrderNotificationValidationError({
    ...content,
    body: DEFAULT_CAMPAIGN_TEMPLATE.body,
    ctaUrl: "{{CHECKOUT_URL}}",
  });
}

/** Never includes order data or a checkout, even when preview vars contain them. */
export function buildStoreNoticeHtml(
  input: Parameters<typeof buildCampaignHtml>[0],
): string {
  return buildCampaignHtml({
    ...input,
    ctaUrl: "",
    fallbackText: "",
    vars: {
      ...input.vars,
      pedido: "",
      produto: "",
      valor: "",
      checkoutUrl: "",
      lojaUrl: "",
    },
  });
}
