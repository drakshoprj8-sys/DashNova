import { buildCampaignHtml, DEFAULT_CAMPAIGN_TEMPLATE } from "./template";
import {
  buildStoreNoticeContent,
  getStoreNoticeValidationError,
} from "./store-notice";
import type { NotificationPreferences } from "./notification-content";
import {
  buildStoreOfferContent,
  OFFER_BUTTONS,
  type StoreOffer,
} from "./store-offer";

export const STORE_NOTICE_OFFER_KIND = "store-notice-optional-purchase-v1";

function offerSection(offer: StoreOffer, button: string) {
  const content = buildStoreOfferContent(offer, button);
  return content.body.slice(content.body.indexOf("\n\n") + 2);
}

export function buildStoreNoticeOfferContent(
  preferences: NotificationPreferences,
  offer: StoreOffer,
  button: string,
) {
  const notice = buildStoreNoticeContent(preferences);
  const purchase = buildStoreOfferContent(offer, button);
  return {
    ...notice,
    body: `${notice.body}\n\n${offerSection(offer, button)}`,
    articleName: purchase.articleName,
    ctaLabel: purchase.ctaLabel,
    ctaUrl: purchase.ctaUrl,
    fallbackText: purchase.fallbackText,
  };
}

export function getStoreNoticeOfferValidationError(
  content: Record<string, unknown>,
  offer: StoreOffer,
): string | null {
  const button = typeof content.ctaLabel === "string" ? content.ctaLabel : "";
  if (!OFFER_BUTTONS.some((label) => label === button))
    return "Selecione um texto de botão de nova compra.";
  const expected = buildStoreOfferContent(offer, button);
  const suffix = `\n\n${offerSection(offer, button)}`;
  const body =
    typeof content.body === "string" ? content.body.replace(/\r\n/g, "\n") : "";
  if (
    !body.endsWith(suffix) ||
    ["articleName", "ctaUrl", "fallbackText"].some(
      (field) => content[field] !== expected[field as keyof typeof expected],
    )
  )
    return "A oferta mudou ou o conteúdo não corresponde ao checkout. Clique em Verificar oferta e confira a nova prévia.";
  return getStoreNoticeValidationError({
    ...content,
    body: body.slice(0, -suffix.length),
    articleName: DEFAULT_CAMPAIGN_TEMPLATE.articleName,
    ctaLabel: DEFAULT_CAMPAIGN_TEMPLATE.ctaLabel,
    ctaUrl: "",
    fallbackText: "",
  });
}

export function buildStoreNoticeOfferHtml(
  input: Parameters<typeof buildCampaignHtml>[0],
  offer: StoreOffer,
): string {
  return buildCampaignHtml({
    ...input,
    ctaUrl: offer.checkoutUrl,
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
