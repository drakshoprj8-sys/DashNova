import { renderCampaignText, type CampaignTemplateVars } from "./template";

export const STORE_OFFER_KIND = "store-optional-purchase-v1";
export const OFFER_BUTTONS = ["Ver oferta e comprar", "Comprar este produto"] as const;
export interface StoreOffer {
  checkoutUrl: string;
  productName: string;
  priceCents: number;
  currency: string;
  storeName: string;
}

export function offerPrice(offer: StoreOffer) {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: offer.currency }).format(offer.priceCents / 100);
}

export function buildStoreOfferContent(offer: StoreOffer, button = OFFER_BUTTONS[0] as string) {
  return {
    subject: `${offer.storeName} — nova oferta: ${offer.productName}`.slice(0, 160),
    preheader: `Nova compra opcional por ${offerPrice(offer)}.`,
    headerName: offer.storeName,
    title: "Uma nova oferta da nossa loja",
    articleName: offer.productName,
    body: `Olá {{PRIMEIRO_NOME}},\n\nA ${offer.storeName} apresenta uma nova oferta:\n\n${offer.productName}\nPreço por unidade: ${offerPrice(offer)}. Portes e opções de entrega apresentados no checkout.\n\nEsta compra é opcional e independente de pedidos anteriores. Não existe cobrança pendente nem pagamento necessário para receber uma encomenda anterior.`,
    ctaLabel: button,
    ctaUrl: offer.checkoutUrl,
    fallbackText: "Se preferir, abra o endereço da oferta no navegador.",
  };
}

function escape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildStoreOfferHtml(offer: StoreOffer, vars: CampaignTemplateVars, button?: string) {
  const content = buildStoreOfferContent(offer, button);
  const paragraphs = escape(renderCampaignText(content.body, vars)).split("\n\n").map((p) => `<p style="line-height:1.65;margin:0 0 18px">${p.replace(/\n/g, "<br>")}</p>`).join("");
  return `<!doctype html><html lang="pt"><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px 12px;background:#f3f4f6;font:14px Arial,sans-serif;color:#111827"><div style="display:none;max-height:0;overflow:hidden">${escape(content.preheader)}</div><div style="max-width:600px;margin:auto;background:white;border-top:6px solid #cc0000;padding:32px;box-sizing:border-box"><h2 style="color:#cc0000">${escape(offer.storeName)}</h2><h3>${escape(content.title)}</h3>${paragraphs}<p style="margin:28px 0;text-align:center"><a href="${escape(offer.checkoutUrl)}" style="display:inline-block;background:#cc0000;color:white;text-decoration:none;padding:15px 28px;border-radius:4px;font-weight:bold">${escape(content.ctaLabel)}</a></p><p style="font-size:12px">${escape(content.fallbackText)}<br><a href="${escape(offer.checkoutUrl)}" style="color:#cc0000;word-break:break-all">${escape(offer.checkoutUrl)}</a></p><hr style="border:0;border-top:1px solid #ddd"><p style="font-size:12px;line-height:1.6">Oferta comercial da ${escape(offer.storeName)}.<br>Para deixar de receber, contacte o apoio da loja.</p></div></body></html>`;
}

export function isStoreOffer(value: unknown): value is StoreOffer {
  if (!value || typeof value !== "object") return false;
  const offer = value as StoreOffer;
  return typeof offer.checkoutUrl === "string" && /^https:\/\//.test(offer.checkoutUrl) &&
    typeof offer.productName === "string" && typeof offer.storeName === "string" &&
    Number.isSafeInteger(offer.priceCents) && offer.priceCents > 0 && offer.currency === "EUR";
}
