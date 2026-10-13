import type { NotificationPreferences } from "./notification-content";
import {
  buildStoreNoticeContent,
  getStoreNoticeValidationError,
} from "./store-notice";
import { buildCampaignHtml, DEFAULT_CAMPAIGN_TEMPLATE } from "./template";

export const STORE_NOTICE_LINK_KIND = "store-notice-optional-link-v1";
export const NOTICE_LINK_DEFAULTS = {
  url: "",
  label: "Ver novidades",
  fallbackText:
    "Se o botão não funcionar, copie o endereço abaixo no navegador.",
};
export type NoticeLink = typeof NOTICE_LINK_DEFAULTS;
const linkNotice =
  "Este link é opcional. Eventuais novas compras são independentes de pedidos anteriores. Este botão não representa uma cobrança de pedidos anteriores.";

export function isValidNoticeLink(value: string): boolean {
  if (value.length > 2048 || /[\s<>"{}]/.test(value)) return false;
  try {
    const url = new URL(value);
    const storeHost = url.hostname.replace(/^www\./, "");
    // Payment-link campaigns in the existing history charge an administrative
    // fee while impersonating postal services. Notices must not reuse that flow.
    if (
      /^suaempresacto?\.site$/i.test(storeHost) &&
      /^\/pagar(?:\/|$)/i.test(url.pathname)
    )
      return false;
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function buildStoreNoticeLinkContent(
  preferences: NotificationPreferences,
  link: NoticeLink,
) {
  const notice = buildStoreNoticeContent(preferences);
  if (!link.url.trim()) return notice;
  return {
    ...notice,
    body: `${notice.body}\n\n${linkNotice}`,
    ctaLabel: link.label.trim(),
    ctaUrl: link.url.trim(),
    fallbackText: link.fallbackText.trim(),
  };
}

export function getStoreNoticeLinkValidationError(
  content: Record<string, unknown>,
): string | null {
  if (typeof content.ctaUrl !== "string" || !isValidNoticeLink(content.ctaUrl))
    return "Link do botão: informe uma URL completa começando com https:// ou http://.";
  if (
    typeof content.ctaLabel !== "string" ||
    content.ctaLabel.trim().length < 2 ||
    content.ctaLabel.length > 60 ||
    /[<>\r\n{}]|\b(?:correios|ctt|taxa|retid[ao]|libertar|bloquead[ao]|suspens[ao])\b/i.test(
      content.ctaLabel,
    )
  )
    return "Texto do botão: use de 2 a 60 caracteres para descrever o destino do link.";
  if (
    typeof content.fallbackText !== "string" ||
    content.fallbackText.length > 240 ||
    /[<>\r\n{}]|\b(?:correios|ctt|taxa|retid[ao]|libertar|bloquead[ao]|suspens[ao])\b/i.test(
      content.fallbackText,
    )
  )
    return "Texto do link alternativo: use até 240 caracteres.";
  const body =
    typeof content.body === "string" ? content.body.replace(/\r\n/g, "\n") : "";
  const suffix = `\n\n${linkNotice}`;
  if (!body.endsWith(suffix))
    return "Mantenha a indicação de link opcional na mensagem.";
  return getStoreNoticeValidationError({
    ...content,
    body: body.slice(0, -suffix.length),
    ctaLabel: DEFAULT_CAMPAIGN_TEMPLATE.ctaLabel,
    ctaUrl: "",
    fallbackText: "",
  });
}

export function buildStoreNoticeLinkHtml(
  input: Parameters<typeof buildCampaignHtml>[0],
): string {
  return buildCampaignHtml({
    ...input,
    ctaUrl: input.ctaUrl && isValidNoticeLink(input.ctaUrl) ? input.ctaUrl : "",
    vars: {
      ...input.vars,
      pedido: "",
      produto: input.vars.produto === "o seu produto" ? "" : input.vars.produto,
      valor: "",
      checkoutUrl: "",
      lojaUrl: "",
    },
  });
}
