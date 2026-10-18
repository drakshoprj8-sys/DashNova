import type { NotificationPreferences } from "./notification-content";
import { getOrderNotificationValidationError } from "./notification-policy";
import {
  buildStoreNoticeContent,
  getStoreNoticeValidationError,
} from "./store-notice";
import { buildCampaignHtml, DEFAULT_CAMPAIGN_TEMPLATE } from "./template";

export const STORE_NOTICE_TRACKING_KIND = "store-notice-order-tracking-v1";
export const TRACKING_BUTTON_LABEL = "Acompanhar pedido";
// Reserved, non-resolving example domain: previews never expose a real order.
export const TRACKING_PREVIEW_URL =
  "https://pedido.example.invalid/acompanhar/demonstracao";

export function buildStoreNoticeTrackingContent(
  preferences: NotificationPreferences,
) {
  return {
    ...buildStoreNoticeContent(preferences),
    ctaLabel: preferences.ctaLabel,
    ctaUrl: "{{CHECKOUT_URL}}",
  };
}

export function getStoreNoticeTrackingValidationError(
  content: Record<string, unknown>,
): string | null {
  if (
    content.ctaUrl !== "{{CHECKOUT_URL}}" ||
    content.fallbackText !== "" ||
    content.checkoutMode === "checkout" ||
    content.offerUrl
  ) {
    return "Acompanhamento: o endereço é gerado para cada pedido; não inclua checkout, oferta ou URL manual.";
  }
  const labelError = getOrderNotificationValidationError({
    ...DEFAULT_CAMPAIGN_TEMPLATE,
    ctaLabel: content.ctaLabel,
  });
  if (labelError) return labelError;
  return getStoreNoticeValidationError({
    ...content,
    ctaLabel: DEFAULT_CAMPAIGN_TEMPLATE.ctaLabel,
    ctaUrl: "",
  });
}

function isOrderTrackingUrl(value: string, appUrl: string): boolean {
  if (value === TRACKING_PREVIEW_URL) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.origin === new URL(appUrl).origin &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      /^\/acompanhar\/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

/** Server supplies a signed URL after checking the order and its customer. */
export function buildStoreNoticeTrackingHtml(
  input: Parameters<typeof buildCampaignHtml>[0],
): string {
  return buildCampaignHtml({
    ...input,
    ctaUrl: isOrderTrackingUrl(input.vars.checkoutUrl, input.vars.lojaUrl)
      ? "{{CHECKOUT_URL}}"
      : "",
    fallbackText: "Endereço de acompanhamento do seu pedido:",
  });
}
